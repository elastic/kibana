define(function (require) {
  var module = require('modules').get('app/dashboard');

 // bring in the factory
  require('./_saved_dashboard');

  // This is the only thing that gets injected into controllers
  module.service('savedDashboards', function (SavedDashboard, config, es) {

    // Returns a single dashboard by ID, should be the name of the dashboard
    this.get = function (id) {

      // Returns a promise that contains a dashboard which is a subclass of docSource
      return (new SavedDashboard(id)).init();
    };

    this.find = function (searchString) {
      return es.search({
        index: config.file.kibanaIndex,
        type: 'dashboard',
        body: {
          query: {
            multi_match: {
              query: searchString || '',
              type: 'phrase_prefix',
              fields: ['title^3', 'description'],
              zero_terms_query: 'all'
            }
          }
        }
      })
      .then(function (resp) {
        return resp.hits.hits.map(function (hit) {
          var source = hit._source;
          source.id = hit._id;
          source.url = '#/dashboard/' + hit._id;
          return source;
        });
      });
    };
  });
});