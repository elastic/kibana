define(function (require) {
  return function IndexPatternFactory(Private, timefilter, configFile, Notifier) {
    var _ = require('lodash');
    var angular = require('angular');
    var errors = require('errors');

    var mapper = Private(require('./_mapper'));
    var fieldFormats = Private(require('./_field_formats'));
    var patternCache = Private(require('./_pattern_cache'));
    var intervals = Private(require('./_intervals'));
    var mappingSetup = Private(require('utils/mapping_setup'));
    var DocSource = Private(require('courier/data_source/doc_source'));

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
      var pattern = this;

      // set defaults
      pattern.id = id;
      pattern.title = id;
      pattern.customFormats = {};

      var docSource = new DocSource();

      pattern.init = function () {
        // tell the docSource where to find the doc
        docSource
          .index(configFile.kibanaIndex)
          .type(type)
          .id(pattern.id);

        // check that the mapping for this type is defined
        return mappingSetup.isDefined(type)
        .then(function (defined) {
          if (defined) return true;
          return mappingSetup.setup(type, mapping);
        })
        .then(function () {
          // If there is no id, then there is no document to fetch from elasticsearch
          if (!pattern.id) return;

          // fetch the object from ES
          return docSource.fetch()
          .then(function applyESResp(resp) {
            if (!resp.found) throw new errors.SavedObjectNotFound(type);

            // deserialize any json fields
            _.forOwn(mapping, function ittr(fieldMapping, name) {
              if (fieldMapping._deserialize) {
                resp._source[name] = fieldMapping._deserialize(resp._source[name], resp, name, fieldMapping);
              }
            });

            // Give obj all of the values in _source.fields
            _.assign(pattern, resp._source);

            if (pattern.id) {
              if (!pattern.fields) return pattern.fetchFields();
              afterFieldsSet();
            }

            // Any time obj is updated, re-call applyESResp
            docSource.onUpdate().then(applyESResp, notify.fatal);
          });
        })
        .then(function () {
          // return our obj as the result of init()
          return pattern;
        });
      };

      function afterFieldsSet() {
        pattern.fieldsByName = {};
        pattern.fields.forEach(function (field) {
          pattern.fieldsByName[field.name] = field;

          // non-enumerable type so that it does not get included in the JSON
          Object.defineProperty(field, 'format', {
            enumerable: false,
            get: function () {
              var formatName = pattern.customFormats && pattern.customFormats[field.name];
              return formatName ? fieldFormats.byName[formatName] : fieldFormats.defaultByType[field.type];
            }
          });
        });
      }

      pattern.getInterval = function () {
        return this.intervalName && _.find(intervals, { name: this.intervalName });
      };

      pattern.toIndexList = function (start, stop) {
        var interval = this.getInterval();
        if (interval) {
          return intervals.toIndexList(pattern.id, interval, start, stop);
        } else {
          return pattern.id;
        }
      };

      pattern.save = function () {
        var body = {};

        // serialize json fields
        _.forOwn(mapping, function (fieldMapping, fieldName) {
          if (pattern[fieldName] != null) {
            body[fieldName] = (fieldMapping._serialize)
              ? fieldMapping._serialize(pattern[fieldName])
              : pattern[fieldName];
          }
        });

        // ensure that the docSource has the current pattern.id
        docSource.id(pattern.id);

        // index the document
        return docSource.doIndex(body)
        .then(function (id) {
          pattern.id = id;
          return pattern.id;
        });
      };

      pattern.refreshFields = function () {
        return mapper.clearCache(pattern)
        .then(function () {
          return pattern.fetchFields();
        });
      };

      pattern.fetchFields = function () {
        return mapper.getFieldsForIndexPattern(pattern, true)
        .then(function (fields) {
          pattern.fields = fields;
          afterFieldsSet();
          return pattern.save();
        });
      };

      pattern.toJSON = function () {
        return pattern.id;
      };

      pattern.toString = function () {
        return '' + pattern.toJSON();
      };
    }
    return IndexPattern;
  };
});