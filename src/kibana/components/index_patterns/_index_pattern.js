define(function (require) {
  return function IndexPatternFactory(Private, timefilter, configFile, Notifier, config, Promise, $rootScope) {
    var _ = require('lodash');
    var errors = require('errors');
    var angular = require('angular');

    var fieldformats = Private(require('registry/field_formats'));
    var kbnUrl = Private(require('components/url/url'));
    var getIds = Private(require('components/index_patterns/_get_ids'));
    var mapper = Private(require('components/index_patterns/_mapper'));
    var intervals = Private(require('components/index_patterns/_intervals'));
    var Field = Private(require('components/index_patterns/_field'));
    var flattenHit = require('components/index_patterns/_flatten_hit');
    var formatHit = require('components/index_patterns/_format_hit');
    var getComputedFields = require('components/index_patterns/_get_computed_fields');
    var DocSource = Private(require('components/courier/data_source/doc_source'));
    var mappingSetup = Private(require('utils/mapping_setup'));
    var IndexedArray = require('utils/indexed_array/index');

    var type = 'index-pattern';

    var notify = new Notifier();

    var mapping = mappingSetup.expandShorthand({
      title: 'string',
      timeFieldName: 'string',
      intervalName: 'string',
      fields: 'json',
      fieldFormatMap: {
        type: 'string',
        _serialize: function (map) {
          if (map == null) return;

          var count = 0;
          var serialized = _.transform(map, function (flat, format, field) {
            if (!format) return;
            count++;
            flat[field] = {
              id: format.type.id,
              params: format.params()
            };
          });

          if (count) return angular.toJson(serialized);
        },
        _deserialize: function (map) {
          if (map == null) return {};
          return _.mapValues(angular.fromJson(map), function (mapping) {
            var FieldFormat = fieldformats.byId[mapping.id];
            return FieldFormat && new FieldFormat(mapping.params);
          });
        }
      }
    });

    function IndexPattern(id) {
      var self = this;

      setId(id);

      var docSource = new DocSource();

      self.init = function () {
        // tell the docSource where to find the doc
        docSource
        .index(configFile.kibana_index)
        .type(type)
        .id(self.id);

        // listen for config changes and update field list
        $rootScope.$on('change:config', function () {
          initFields();
        });

        return mappingSetup.isDefined(type)
        .then(function (defined) {
          // create mapping for this type if one does not exist
          if (defined) return true;
          return mappingSetup.setup(type, mapping);
        })
        .then(function () {
          // If there is no id, then there is no document to fetch from elasticsearch
          if (!self.id) return;

          // fetch the object from ES
          return docSource.fetch()
          .then(function applyESResp(resp) {
            if (!resp.found) throw new errors.SavedObjectNotFound(type, self.id);

            // deserialize any json fields
            _.forOwn(mapping, function ittr(fieldMapping, name) {
              if (fieldMapping._deserialize) {
                resp._source[name] = fieldMapping._deserialize(resp._source[name], resp, name, fieldMapping);
              }
            });

            // Give obj all of the values in _source.fields
            _.assign(self, resp._source);

            self._indexFields();

            // Any time obj is updated, re-call applyESResp
            docSource.onUpdate().then(applyESResp, notify.fatal);
          });
        })
        .then(function () {
          // return our obj as the result of init()
          return self;
        });
      };

      function initFields(fields) {
        fields = fields || self.fields;
        self.fields = new IndexedArray({
          index: ['name'],
          group: ['type'],
          initialSet: fields.map(function (field) {
            return new Field(self, field);
          })
        });
      }

      self._indexFields = function () {
        if (self.id) {
          if (!self.fields) {
            return self.refreshFields();
          } else {
            initFields();
          }
        }
      };

      self.addScriptedField = function (name, script, type, lang) {
        type = type || 'string';

        var scriptFields = _.pluck(self.getFields('scripted'), 'name');

        if (_.contains(scriptFields, name)) {
          throw new errors.DuplicateField(name);
        }

        self.fields.push({
          name: name,
          script: script,
          type: type,
          scripted: true,
          lang: lang
        });

        self.save();
      };

      self.removeScriptedField = function (name) {
        var fieldIndex = _.findIndex(self.fields, {
          name: name,
          scripted: true
        });

        self.fields.splice(fieldIndex, 1);

        self.save();
      };

      self.popularizeField = function (fieldName, unit) {
        if (unit == null) unit = 1;

        var field = _.deepGet(self, ['fields', 'byName', fieldName]);
        if (!field) return;

        var count = Math.max((field.count || 0) + unit, 0);
        if (field.count !== count) {
          field.count = count;
          self.save();
        }
      };

      self.getFields = function (type) {
        return _.where(self.fields, { scripted: type === 'scripted' });
      };

      self.getInterval = function () {
        return this.intervalName && _.find(intervals, { name: this.intervalName });
      };

      self.toIndexList = function (start, stop) {
        var interval = this.getInterval();
        if (interval) {
          return intervals.toIndexList(self.id, interval, start, stop);
        } else {
          return self.id;
        }
      };

      self.prepBody = function () {
        var body = {};

        // serialize json fields
        _.forOwn(mapping, function (fieldMapping, fieldName) {
          if (self[fieldName] != null) {
            body[fieldName] = (fieldMapping._serialize)
              ? fieldMapping._serialize(self[fieldName])
              : self[fieldName];
          }
        });

        // ensure that the docSource has the current self.id
        docSource.id(self.id);

        // clear the indexPattern list cache
        getIds.clearCache();
        return body;
      };

      // refresh the id and editRoute
      function setId(id) {
        self.id = id;
        self.editRoute = id && kbnUrl.eval('/settings/indices/{{id}}', { id: id });

        return self.id;
      }

      self.create = function () {
        var body = self.prepBody();
        return docSource.doCreate(body)
        .then(setId)
        .catch(function (err) {
          var confirmMessage = 'Are you sure you want to overwrite this?';
          if (_.deepGet(err, 'origError.status') === 409 && window.confirm(confirmMessage)) {
            return docSource.doIndex(body).then(setId);
          }
          return Promise.resolve(false);
        });
      };

      self.save = function () {
        var body = self.prepBody();
        return docSource.doIndex(body).then(setId);
      };

      self.refreshFields = function () {
        return mapper.clearCache(self)
        .then(self._fetchFields)
        .then(self.save);
      };

      self._fetchFields = function () {
        return mapper.getFieldsForIndexPattern(self, true)
        .then(function (fields) {
          // append existing scripted fields
          fields = fields.concat(self.getFields('scripted'));

          // initialize self.field with this field list
          initFields(fields);
        });
      };

      self.toJSON = function () {
        return self.id;
      };

      self.toString = function () {
        return '' + self.toJSON();
      };

      self.metaFields = config.get('metaFields');
      self.flattenHit = _.partial(flattenHit, self);
      self.formatHit = _.partial(formatHit, self);
      self.getComputedFields = getComputedFields.bind(self);
    }
    return IndexPattern;
  };
});
