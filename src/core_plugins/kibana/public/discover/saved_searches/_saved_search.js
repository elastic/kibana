import _ from 'lodash';
import 'ui/notify';
import { uiModules } from 'ui/modules';


const module = uiModules.get('discover/saved_searches', [
  'kibana/notify',
  'kibana/courier'
]);

module.factory('SavedSearch', function (courier) {
  _.class(SavedSearch).inherits(courier.SavedObject);
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
      },
      afterESResp: SavedSearch._afterESResp
    });
  }

  SavedSearch.type = 'search';

  SavedSearch.mapping = {
    title: 'text',
    description: 'text',
    hits: 'integer',
    columns: 'keyword',
    sort: 'keyword',
    version: 'integer',
    explicitTimeColumn: 'boolean'
  };

  // Order these fields to the top, the rest are alphabetical
  SavedSearch.fieldOrder = ['title', 'description'];

  SavedSearch.searchSource = true;

  SavedSearch._afterESResp = function () {
    // we used to by default always add in the timeFieldName implicitly, so we're
    // automatically adding this in for the user for legacy savedSearches

    if (this.explicitTimeColumn) {
      return;
    }

    this.explicitTimeColumn = true;
    if (!this.id) {
      return;
    }

    const indexPattern = this.searchSource.get('index');
    this.columns.unshift(indexPattern.timeFieldName);
    return this;
  };

  return SavedSearch;
});
