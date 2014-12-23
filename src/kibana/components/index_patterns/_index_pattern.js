define(function (require) {
  return function IndexPatternFactory(Private, timefilter, configFile, Notifier, shortDotsFilter, config) {
    var _ = require('lodash');
    var angular = require('angular');
    var errors = require('errors');

    var getIds = Private(require('components/index_patterns/_get_ids'));
    var mapper = Private(require('components/index_patterns/_mapper'));
    var fieldFormats = Private(require('components/index_patterns/_field_formats'));
    var intervals = Private(require('components/index_patterns/_intervals'));
    var fieldTypes = Private(require('components/index_patterns/_field_types'));
    var flattenSearchResponse = require('components/index_patterns/_flatten_search_response');
    var flattenHit = require('components/index_patterns/_flatten_hit');
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
      customFormats: 'json',
      fields: 'json'
    });

    function IndexPattern(id) {
      var self = this;

      // set defaults
      self.id = id;
      self.title = id;
      self.customFormats = {};

      var docSource = new DocSource();

      self.init = function () {
        // tell the docSource where to find the doc
        docSource
        .index(configFile.kibana_index)
        .type(type)
        .id(self.id);

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

      function setIndexedValue(key, value) {
        value = value || self[key];
        self[key] = new IndexedArray({
          index: ['name'],
          group: ['type'],
          initialSet: value.map(function (field) {
            field.count = field.count || 0;
            if (field.hasOwnProperty('format')) return field;

            var type = fieldTypes.byName[field.type];
            Object.defineProperties(field, {
              scripted: {
                // enumerable properties end up in the JSON
                enumerable: true,
                value: !!field.scripted
              },
              sortable: {
                value: field.indexed && type.sortable
              },
              filterable: {
                value: field.name === '_id' || (field.indexed && type.filterable)
              },
              format: {
                get: function () {
                  var formatName = self.customFormats && self.customFormats[field.name];
                  return formatName ? fieldFormats.byName[formatName] : fieldFormats.defaultByType[field.type];
                }
              },
              displayName: {
                get: function () {
                  return shortDotsFilter(field.name);
                }
              }
            });

            return field;
          })
        });
      }

      self._indexFields = function () {
        if (self.id) {
          if (!self.fields) {
            return self.refreshFields();
          } else {
            setIndexedValue('fields');
          }
        }
      };

      self.addScriptedField = function (name, script, type) {
        type = type || 'string';

        var scriptFields = _.pluck(self.getFields('scripted'), 'name');

        if (_.contains(scriptFields, name)) {
          throw new errors.DuplicateField(name);
        }

        var scriptedField = self.fields.push({
          name: name,
          script: script,
          type: type,
          scripted: true,
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
        var getScripted = (type === 'scripted');
        return _.where(self.fields, function (field) {
          return field.scripted ? getScripted : !getScripted;
        });
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

      self.save = function () {
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

        // index the document
        return docSource.doIndex(body)
        .then(function (id) {
          self.id = id;
          return self.id;
        });
      };

      self.refreshFields = function () {
        return mapper.clearCache(self)
        .then(function () {
          return self._fetchFields()
          .then(self.save);
        });
      };

      self._fetchFields = function () {
        return mapper.getFieldsForIndexPattern(self, true)
        .then(function (fields) {
          // append existing scripted fields
          fields = fields.concat(self.getFields('scripted'));
          setIndexedValue('fields', fields);
        });
      };

      self.toJSON = function () {
        return self.id;
      };

      self.toString = function () {
        return '' + self.toJSON();
      };

      self.metaFields = config.get('metaFields');
      self.flattenSearchResponse = flattenSearchResponse.bind(self);
      self.flattenHit = flattenHit.bind(self);
      self.getComputedFields = getComputedFields.bind(self);


    }
    return IndexPattern;
  };
});
