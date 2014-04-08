define(function (require) {
  var module = require('modules').get('app/dashboard');

  require('../factories/saved_dashboard');

  module.service('savedDashboards', function (SavedDashboard) {
    this.get = function (id) {
      return (new SavedDashboard(id)).init();
    };
  });
});