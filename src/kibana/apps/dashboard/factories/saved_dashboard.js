define(function (require) {
  var module = require('modules').get('app/dashboard');
  var _ = require('lodash');
  var inherits = require('utils/inherits');

  module.factory('SavedDashboard', function (configFile, courier, Promise, createNotifier, CouriersDocSource) {
    var notify = createNotifier({
      location: 'Saved Dashboard'
    });

    function SavedDashboard(id) {
      var dash = this;
      CouriersDocSource.call(dash, courier);

      dash.index(configFile.kibanaIndex)
        .type('dashboard')
        .id(id || void 0);

      dash.unsaved = true;
      dash.details = {
        title: 'New Dashboard',
        panels: []
      };

      function applyUpdate(resp) {
        if (!resp.found) throw new Error('Unable to find that Dashboard...');

        dash.unsaved = false;
        dash.set('id', resp._id);
        _.assign(dash.details, resp._source);
      }

      dash.save = function () {
        return dash.doIndex(dash.details)
        .then(function (id) {
          dash.set('id', id);
          return id;
        });
      };

      dash.init = _.once(function () {
        // nothing to do unless the doc is actually saved
        if (!dash.get('id')) return Promise.resolved(dash);

        return dash.fetch().then(function (resp) {
          applyUpdate(resp);
          return dash;
        });
      });

    }
    inherits(SavedDashboard, CouriersDocSource);

    return SavedDashboard;
  });
});