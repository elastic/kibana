define(function (require) {
  var module = require('modules').get('app/dashboard');
  var _ = require('lodash');
  var inherits = require('utils/inherits');

  require('saved_object/saved_object');

  // Used only by the savedDashboards service, usually no reason to change this
  module.factory('SavedDashboard', function (configFile, courier, Promise, createNotifier, SavedObject) {

    // SavedDashboard constructor. Usually you'd interact with an instance of this.
    // ID is option, without it one will be generated on save.
    function SavedDashboard(id) {
      SavedObject.call(this, {
        // this object will be saved at {{configFile.kibanaIndex}}/dashboard/{{id}}
        type: 'dashboard',

        // if this is ==null then the SavedObject will be assigned the defaults
        id: id,

        // if the index is not defined, we will push this mapping into ES
        mapping: {
          title: 'string',
          hits: 'integer',
          description: 'string',
          panelsJSON: 'string'
        },

        // defeault values to assign to the doc
        defaults: {
          title: 'New Dashboard',
          hits: 0,
          description: '',
          panelsJSON: '[]'
        },

        // should a search source be made available for this SavedObject
        searchSource: false
      });
    }

    // Sets savedDashboard.prototype to an instance of SavedObject
    inherits(SavedDashboard, SavedObject);

    return SavedDashboard;
  });
});