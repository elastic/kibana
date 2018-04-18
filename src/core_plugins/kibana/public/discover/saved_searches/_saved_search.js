import 'ui/notify';
import { uiModules } from 'ui/modules';
import { createLegacyClass } from 'ui/utils/legacy_class';

const module = uiModules.get('discover/saved_searches', [
  'kibana/notify',
  'kibana/courier'
]);

module.factory('SavedSearch', function (courier) {
  createLegacyClass(SavedSearch).inherits(courier.SavedObject);
  function SavedSearch(id) {
    courier.SavedObject.call(this, {
      type: SavedSearch.type,
      mapping: SavedSearch.mapping,
      searchSource: SavedSearch.searchSource,

      id: id,
      defaults: {
        title: 'New Saved Search',
        description: '',
        columns: [],
        hits: 0,
        sort: [],
        version: 1
      }
    });

    this.showInRecenltyAccessed = true;
  }

  SavedSearch.type = 'search';

  SavedSearch.mapping = {
    title: 'text',
    description: 'text',
    hits: 'integer',
    columns: 'keyword',
    sort: 'keyword',
    version: 'integer'
  };

  // Order these fields to the top, the rest are alphabetical
  SavedSearch.fieldOrder = ['title', 'description'];

  SavedSearch.searchSource = true;

  SavedSearch.prototype.getFullPath = function () {
    return `/app/kibana#/discover/${this.id}`;
  };

  return SavedSearch;
});
