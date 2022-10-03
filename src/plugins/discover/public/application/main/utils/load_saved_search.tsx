import {DiscoverServices} from '@kbn/discover-plugin/public/build_services';
import {DiscoverStateContainer} from '@kbn/discover-plugin/public/application/main/services/discover_state';
import {DataViewSpec} from '@kbn/data-views-plugin/common';
import {getSavedSearch} from '@kbn/saved-search-plugin/public';
import {loadDataViewBySavedSearch} from '@kbn/discover-plugin/public/application/main/load_data_view_by_saved_search';
import {
  restoreStateFromSavedSearch
} from '@kbn/discover-plugin/public/services/saved_searches/restore_from_saved_search';

export const loadSavedSearch = async (
  id: string,
  {
    services,
    stateContainer,
    setError,
    dataViewSpec,
  }: {
    services: DiscoverServices;
    stateContainer: DiscoverStateContainer;
    setError: (e: Error) => void;
    dataViewSpec?: DataViewSpec;
  }
) => {
  const currentSavedSearch = await getSavedSearch(id, {
    search: services.data.search,
    savedObjectsClient: services.core.savedObjects.client,
    spaces: services.spaces,
    savedObjectsTagging: services.savedObjectsTagging,
  });

  const currentDataView = await loadDataViewBySavedSearch(
    currentSavedSearch,
    stateContainer,
    services,
    setError,
    dataViewSpec
  );

  if (!currentDataView) {
    return;
  }

  if (!currentSavedSearch.searchSource.getField('index')) {
    currentSavedSearch.searchSource.setField('index', currentDataView);
  }

  restoreStateFromSavedSearch({
    savedSearch: currentSavedSearch,
    timefilter: services.timefilter,
  });
  return currentSavedSearch;
};
