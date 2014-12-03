define(function (require) {
  var module = require('modules').get('app/dashboard');
  var _ = require('lodash');
  var inherits = require('lodash').inherits;

  // Used only by the savedDashboards service, usually no reason to change this
  module.factory('SavedDashboard', function (courier) {

    // SavedDashboard constructor. Usually you'd interact with an instance of this.
    // ID is option, without it one will be generated on save.
    _(SavedDashboard).inherits(courier.SavedObject);
    function SavedDashboard(id) {
      // Gives our SavedDashboard the properties of a SavedObject
      courier.SavedObject.call(this, {
        // this object will be saved at {{configFile.kibana_index}}/dashboard/{{id}}
        type: SavedDashboard.type,

        // if this is null/undefined then the SavedObject will be assigned the defaults
        id: id,

        // if type:dashboard has no mapping, we push this mapping into ES
        mapping: {
          title: 'string',
          hits: 'integer',
          description: 'string',
          panelsJSON: 'string'
        },

        // defeult values to assign to the doc
        defaults: {
          title: 'New Dashboard',
          hits: 0,
          description: '',
          panelsJSON: '[]'
        },

        searchSource: true,

        clearSavedIndexPattern: true
      });
    }

    SavedDashboard.type = 'dashboard';

    return SavedDashboard;
  });
});
