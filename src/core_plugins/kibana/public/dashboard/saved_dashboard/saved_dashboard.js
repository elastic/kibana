import angular from 'angular';
import { uiModules } from 'ui/modules';
import { createDashboardEditUrl } from '../dashboard_constants';
import { createLegacyClass } from 'ui/utils/legacy_class';

const module = uiModules.get('app/dashboard');

// Used only by the savedDashboards service, usually no reason to change this
module.factory('SavedDashboard', function (courier, config) {
  // SavedDashboard constructor. Usually you'd interact with an instance of this.
  // ID is option, without it one will be generated on save.
  createLegacyClass(SavedDashboard).inherits(courier.SavedObject);
  function SavedDashboard(id) {
    // Gives our SavedDashboard the properties of a SavedObject
    SavedDashboard.Super.call(this, {
      type: SavedDashboard.type,
      mapping: SavedDashboard.mapping,
      searchSource: SavedDashboard.searchsource,

      // if this is null/undefined then the SavedObject will be assigned the defaults
      id: id,

      // default values that will get assigned if the doc is new
      defaults: {
        title: 'New Dashboard',
        hits: 0,
        description: '',
        panelsJSON: '[]',
        optionsJSON: angular.toJson({
          darkTheme: config.get('dashboard:defaultDarkTheme'),
          // for BWC reasons we can't default dashboards that already exist without this setting to true.
          useMargins: id ? false : true,
          hidePanelTitles: false,
        }),
        version: 1,
        timeRestore: false,
        timeTo: undefined,
        timeFrom: undefined,
        refreshInterval: undefined
      },

      // if an indexPattern was saved with the searchsource of a SavedDashboard
      // object, clear it. It was a mistake
      clearSavedIndexPattern: true
    });


    this.showInRecenltyAccessed = true;
  }

  // save these objects with the 'dashboard' type
  SavedDashboard.type = 'dashboard';

  // if type:dashboard has no mapping, we push this mapping into ES
  SavedDashboard.mapping = {
    title: 'text',
    hits: 'integer',
    description: 'text',
    panelsJSON: 'text',
    optionsJSON: 'text',
    // Note: this field is no longer used for dashboards created or saved in version 6.2 onward.  We keep it around
    // due to BWC, until we can ensure a migration step for all old dashboards saved in an index, as well as
    // migration steps for importing.  See https://github.com/elastic/kibana/issues/15204 for more info.
    uiStateJSON: 'text',
    version: 'integer',
    timeRestore: 'boolean',
    timeTo: 'keyword',
    timeFrom: 'keyword',
    refreshInterval: {
      type: 'object',
      properties: {
        display: { type: 'keyword' },
        pause: { type: 'boolean' },
        section: { type: 'integer' },
        value: { type: 'integer' }
      }
    }
  };

  // Order these fields to the top, the rest are alphabetical
  SavedDashboard.fieldOrder = ['title', 'description'];

  SavedDashboard.searchsource = true;

  SavedDashboard.prototype.getFullPath = function () {
    return `/app/kibana#${createDashboardEditUrl(this.id)}`;
  };

  return SavedDashboard;
});
