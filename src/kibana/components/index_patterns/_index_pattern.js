define(function (require) {
  return function IndexPatternFactory(Private, timefilter, configFile, Notifier) {
    var _ = require('lodash');
    var angular = require('angular');
    var errors = require('errors');

    var getIds = Private(require('components/index_patterns/_get_ids'));
    var mapper = Private(require('components/index_patterns/_mapper'));
    var fieldFormats = Private(require('components/index_patterns/_field_formats'));
    var intervals = Private(require('components/index_patterns/_intervals'));
    var mappingSetup = Private(require('utils/mapping_setup'));
    var DocSource = Private(require('components/courier/data_source/doc_source'));
    var flattenSearchResponse = require('components/index_patterns/_flatten_search_response');
    var IndexedArray = require('utils/indexed_array/index');

    var type = 'index-pattern';

    var notify = new Notifier();

    var mapping = mappingSetup.expandShorthand({
      title: 'string',
      timeFieldName: 'string',
      intervalName: 'string',
      customFormats: 'json',
      fields: 'json',
      scriptedFields: 'json'
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
        .index(configFile.kibanaIndex)
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

            if (self.id) {
              if (!self.fields || !self.scriptedFields) {
                return self.refreshFields();
              } else {
                setIndexedValue('fields');
              }
            }

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

            // non-enumerable type so that it does not get included in the JSON
            Object.defineProperty(field, 'format', {
              enumerable: false,
              get: function () {
                var formatName = self.customFormats && self.customFormats[field.name];
                return formatName ? fieldFormats.byName[formatName] : fieldFormats.defaultByType[field.type];
              }
            });

            return field;
          })
        });
      }

      self.popularizeField = function (fieldName, unit) {
        if (_.isUndefined(unit)) unit = 1;
        if (!(self.fields.byName && self.fields.byName[fieldName])) return;

        var field = self.fields.byName[fieldName];
        if (!field.count && unit < 1) return;
        if (!field.count) field.count = 1;
        else field.count = field.count + (unit);
        self.save();
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
          .then(self._fetchScriptedFields)
          .then(self.save);
        });
      };

      self._fetchFields = function () {
        return mapper.getFieldsForIndexPattern(self, true)
        .then(function (fields) {
          setIndexedValue('fields', fields);
        });
      };

      self._fetchScriptedFields = function () {
        setIndexedValue('scriptedFields', []);
      };

      self.toJSON = function () {
        return self.id;
      };

      self.toString = function () {
        return '' + self.toJSON();
      };

      self.flattenSearchResponse = flattenSearchResponse.bind(self);

    }
    return IndexPattern;
  };
});
