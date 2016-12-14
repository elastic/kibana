define(function (require) {
  const module = require('ui/modules').get('app/sheet');
  const _ = require('lodash');
  // bring in the factory
  require('./_saved_sheet.js');


  // Register this service with the saved object registry so it can be
  // edited by the object editor.
  require('plugins/kibana/management/saved_object_registry').register({
    service: 'savedSheets',
    title: 'sheets'
  });

  // This is the only thing that gets injected into controllers
  module.service('savedSheets', function (Promise, SavedSheet, kbnIndex, esAdmin, kbnUrl) {
    this.type = SavedSheet.type;
    this.Class = SavedSheet;

    this.loaderProperties = {
      name: 'timelion-sheet',
      noun: 'Saved Sheets',
      nouns: 'saved sheets'
    };

    // Returns a single sheet by ID, should be the name of the sheet
    this.get = function (id) {
      // Returns a promise that contains a sheet which is a subclass of docSource
      return (new SavedSheet(id)).init();
    };

    this.urlFor = function (id) {
      return kbnUrl.eval('#/{{id}}', { id: id });
    };

    this.delete = function (ids) {
      ids = !_.isArray(ids) ? [ids] : ids;
      return Promise.map(ids, function (id) {
        return (new SavedSheet(id)).delete();
      });
    };

    this.find = function (searchString) {
      const self = this;
      let body;
      if (searchString) {
        body = {
          query: {
            simple_query_string: {
              query: searchString + '*',
              fields: ['title^3', 'description'],
              default_operator: 'AND'
            }
          }
        };
      } else {
        body = { query: { match_all: {} } };
      }

      return esAdmin.search({
        index: kbnIndex,
        type: 'timelion-sheet',
        body: body,
        size: 1000
      })
      .then(function (resp) {
        return {
          total: resp.hits.total,
          hits: resp.hits.hits.map(function (hit) {
            const source = hit._source;
            source.id = hit._id;
            source.url = self.urlFor(hit._id);
            return source;
          })
        };
      });
    };
  });
});
