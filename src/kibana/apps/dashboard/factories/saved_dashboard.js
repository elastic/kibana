define(function (require) {
  var module = require('modules').get('app/dashboard');
  var _ = require('lodash');
  var inherits = require('utils/inherits');

  // Used only by the savedDashboards service, usually no reason to change this
  module.factory('SavedDashboard', function (configFile, courier, Promise, createNotifier, CouriersDocSource) {

    // Create a notified for setting alerts
    var notify = createNotifier({
      location: 'Saved Dashboard'
    });

    // SavedDashboard constructor. Usually you'd interact with an instance of this
    // ID is option, otherwise one will be generated on save.
    function SavedDashboard(id) {

      // Keep a reference to this
      var dash = this;

      // Intializes a docSource for dash
      CouriersDocSource.call(dash, courier);

      // Wrap this once so that accidental re-init's don't cause extra ES calls
      dash.init = _.once(function () {
        // If we haven't saved to ES, there's no point is asking ES for the dashboard
        // just return whatever we have
        if (dash.unsaved) return Promise.resolved(dash);

        // Otherwise, get the dashboard.
        return dash.fetch().then(function applyUpdate(resp) {
          if (!resp.found) throw new Error('Unable to find that Dashboard...');

          // Since the dashboard was found, we know it has been saved before
          dash.unsaved = false;

          // Set the ID of our docSource based on ES response
          dash.set('id', resp._id);

          // Give dash.details all of the properties of _source
          _.assign(dash.details, resp._source);

          // Any time dash is updated, re-call applyUpdate
          dash.onUpdate().then(applyUpdate, notify.fatal);

          return dash;
        });
      });

      // Properties needed for Elasticsearch
      dash.index(configFile.kibanaIndex)
        .type('dashboard')
        .id(id || void 0);

      // If we need to do anything different on first save, we know if the dash is unsaved
      // eg, change location.url on first save
      // If there is no id passed in, the dashboard has not been saved yet.
      dash.unsaved = !id;

      // Attach some new properties in a new object so they don't collide
      // Effectively the contents of _source
      dash.details = {
        title: 'New Dashboard',
        panels: []
      };

      // Persist our dash object back into Elasticsearch
      dash.save = function () {

        // dash.doIndex stores dash.detail as the document in elasticxsearch
        return dash.doIndex(dash.details)
        .then(function (id) {
          dash.set('id', id);
          return id;
        });
      };

    }

    // Sets savedDashboard.prototype to an instance of CourierDocSource
    inherits(SavedDashboard, CouriersDocSource);

    return SavedDashboard;
  });
});