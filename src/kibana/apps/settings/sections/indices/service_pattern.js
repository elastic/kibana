define(function (require) {
  var module = require('modules').get('app/dashboard');
  var _ = require('lodash');
  var inherits = require('utils/inherits');

  module.factory('indexPattern', function (configFile, courier, Promise, createNotifier, CouriersDocSource) {
    var notify = createNotifier({
      location: 'Index Pattern'
    });

    function IndexPattern(id) {
      var pattern = this;
      CouriersDocSource.call(pattern, courier);

      dash.index(configFile.kibanaIndex)
        .type('dashboard')
        .id(id || void 0);

      dash.unsaved = true;
      dash.details = {
        title: 'New Dashboard',
        panels: []
      };

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

  module.service('savedDashboards', function (SavedDashboard) {
    this.get = function (id) {
      return (new SavedDashboard(id)).init();
    };
  });

});