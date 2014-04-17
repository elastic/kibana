define(function (require) {
  var app = require('modules').get('app/visualize');
  var typeDefs = require('./_type_defs');

  require('./_saved_vis');

  app.service('savedVisualizations', function (es, config, courier, $q, $timeout, SavedVis) {
    this.get = function (id) {
      return (new SavedVis(id)).init();
    };

    this.find = function (searchString) {
      return es.search({
        index: config.file.kibanaIndex,
        type: 'visualization',
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
          source.url = '#/visualize/edit/' + hit._id;
          source.typeDef = typeDefs.byName[source.typeName];
          source.previewUrl = source.typeDef.previewUrl;
          return source;
        });
      });
    };
  });
});