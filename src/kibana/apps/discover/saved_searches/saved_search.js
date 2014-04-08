define(function (require) {
  var _ = require('lodash');
  var inherits = require('utils/inherits');

  require('notify/notify');

  var module = require('modules').get('discover/saved_searches', [
    'kibana/notify',
    'kibana/courier'
  ]);

  module.factory('SavedSearch', function (configFile, courier, Promise, createNotifier, CouriersSearchSource) {
    var notify = createNotifier({
      location: 'Saved Search'
    });

    function SavedSearch(id) {
      CouriersSearchSource.call(this, courier);

      var search = this;
      var doc = courier.createSource('doc')
        .index(configFile.kibanaIndex)
        .type('saved_searches')
        .id(id || void 0);

      search._dynamicState.id = function () {
        return doc.get('id');
      };

      search.unsaved = true;
      search.details = {
        name: '',
        hits: 0
      };

      function processDocResp(resp) {
        if (!resp.found) {
          throw new Error('Unable to find that Saved Search...');
        }

        if (!doc.get('id')) {
          search.unsaved = false;
          doc.set('id', resp._id);
        }

        search.set(resp._source.state);
        _.assign(search.details, resp._source.details);
      }

      function autoUpdateDoc() {
        return doc.onUpdate(processDocResp)
        .then(function onUpdate(resp) {
          processDocResp(resp);
          return doc.onUpdate(onUpdate);
        });
      }

      this.save = function () {
        return doc.doIndex({
          details: search.details,
          state: search.toJSON()
        }).then(function (id) {
          doc.set('id', id);
          return id;
        });
      };

      search.init = _.once(function () {
        // nothing to do unless the doc is actually saved
        if (!doc.get('id')) return Promise.resolved(search);

        return doc.fetch().then(function (resp) {
          processDocResp(resp);
          autoUpdateDoc().catch(notify.fatal);
          return search;
        });
      });

    }
    inherits(SavedSearch, CouriersSearchSource);

    return SavedSearch;
  });
});