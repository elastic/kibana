define(function (require) {
  var app = require('modules').get('app/visualize');
  var typeDefs = require('./_type_defs');

  require('./_saved_vis');

  // Register this service with the saved object registry so it can be 
  // edited by the object editor.
  require('apps/settings/saved_object_registry').register({
    service: 'savedVisualizations',
    title: 'Visualizations'
  });

  app.service('savedVisualizations', function (es, config, SavedVis) {

    this.get = function (id) {
      return (new SavedVis(id)).init();
    };

    this.urlFor = function (id) {
      return '#/visualize/edit/' + id;
    };

    this.find = function (searchString) {
      var self = this;
      var body = searchString ? {
          query: {
            simple_query_string: {
              query: searchString + '*',
              fields: ['title^3', 'description'],
              default_operator: 'AND'
            }
          }
        }: { query: {match_all: {}}};
      return es.search({
        index: config.file.kibanaIndex,
        type: 'visualization',
        body: body
      })
      .then(function (resp) {
        return resp.hits.hits.map(function (hit) {
          var source = hit._source;
          source.id = hit._id;
          source.url = self.urlFor(hit._id);
          source.typeDef = typeDefs.byName[source.typeName];
          source.icon = source.typeDef.icon;
          return source;
        });
      });
    };
  });
});
