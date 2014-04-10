define(function (require) {
  var module = require('modules').get('app/dashboard');

 // bring in the factory
  require('../factories/saved_dashboard');

  // This is the only thing that gets injected into controllers
  module.service('savedDashboards', function (SavedDashboard) {

    // Returns a single dashboard by ID, should be the name of the dashboard
    this.get = function (id) {

      // Returns a promise that contains a dashboard which is a subclass of docSource
      return (new SavedDashboard(id)).init();
    };
  });
});