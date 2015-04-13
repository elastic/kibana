define(function (require) {
  var app = require('modules').get('app/visualize');
  var _ = require('lodash');

  require('plugins/visualize/saved_visualizations/_saved_vis');

  // Register this service with the saved object registry so it can be
  // edited by the object editor.
  require('plugins/settings/saved_object_registry').register({
    service: 'savedVisualizations',
    title: 'visualizations'
  });

  app.service('savedVisualizations', function (Promise, es, config, SavedVis, Private, Notifier, kbnUrl) {
    var visTypes = Private(require('registry/vis_types'));
    var notify = new Notifier({
      location: 'Saved Visualization Service'
    });

    this.type = SavedVis.type;

    this.get = function (id) {
      return (new SavedVis(id)).init();
    };

    this.urlFor = function (id) {
      return kbnUrl.eval('#/visualize/edit/{{id}}', {id: id});
    };

    this.delete = function (ids) {
      ids = !_.isArray(ids) ? [ids] : ids;
      return Promise.map(ids, function (id) {
        return (new SavedVis(id)).delete();
      });
    };

    this.find = function (searchString) {
      var self = this;
      var body;
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
        body = { query: {match_all: {}}};
      }

      return es.search({
        index: config.file.kibana_index,
        type: 'visualization',
        body: body,
        size: 100,
      })
      .then(function (resp) {
        return {
          total: resp.hits.total,
          hits: _.transform(resp.hits.hits, function (hits, hit) {
            var source = hit._source;
            source.id = hit._id;
            source.url = self.urlFor(hit._id);

            var typeName = source.typeName;
            if (source.visState) {
              try { typeName = JSON.parse(source.visState).type; }
              catch (e) { /* missing typename handled below */ }
            }

            if (!typeName || !visTypes.byName[typeName]) {
              if (!typeName) notify.error('Visualization type is missing. Please add a type to this visualization.', hit);
              else notify.error('Visualization type of "' + typeName + '" is invalid. Please change to a valid type.', hit);
              return kbnUrl.redirect('/settings/objects/savedVisualizations/{{id}}', {id: source.id});
            }

            source.type = visTypes.byName[typeName];
            source.icon = source.type.icon;
            hits.push(source);
          }, [])
        };
      });
    };
  });
});
