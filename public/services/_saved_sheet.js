define(function (require) {
  var module = require('ui/modules').get('app/timelion');
  var _ = require('lodash');
  var moment = require('moment');

  // Used only by the savedSheets service, usually no reason to change this
  module.factory('SavedSheet', function (courier) {

    // SavedSheet constructor. Usually you'd interact with an instance of this.
    // ID is option, without it one will be generated on save.
    _.class(SavedSheet).inherits(courier.SavedObject);
    function SavedSheet(id) {
      // Gives our SavedSheet the properties of a SavedObject
      courier.SavedObject.call(this, {
        type: SavedSheet.type,
        mapping: SavedSheet.mapping,

        // if this is null/undefined then the SavedObject will be assigned the defaults
        id: id,

        // default values that will get assigned if the doc is new
        defaults: {
          title: 'New TimeLion Sheet',
          hits: 0,
          description: '',
          timelion_sheet: ['.es(*)'],
          timelion_interval: '1d',
          timelion_other_interval: '1d',
          timelion_chart_height: 275,
          timelion_columns: 3,
          timelion_rows: 3,
          version: 1,
        }
      });
    }

    // save these objects with the 'sheet' type
    SavedSheet.type = 'timelion-sheet';

    // if type:sheet has no mapping, we push this mapping into ES
    SavedSheet.mapping = {
      title: 'string',
      hits: 'integer',
      description: 'string',
      timelion_sheet: 'string',
      timelion_interval: 'string',
      timelion_other_interval: 'string',
      timelion_chart_height: 'integer',
      timelion_columns: 'integer',
      timelion_rows: 'integer',
      version: 'integer'
    };

    return SavedSheet;
  });
});
