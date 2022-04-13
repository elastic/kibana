/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContactCardEmbeddable } from 'src/plugins/embeddable/public/lib/test_samples';

import { ViewSavedSearchAction } from './view_saved_search_action';
import { SavedSearchEmbeddable } from './saved_search_embeddable';
import { createStartContractMock } from '../__mocks__/start_contract';
import { savedSearchMock } from '../__mocks__/saved_search';
import { discoverServiceMock } from '../__mocks__/services';
import { DataView } from 'src/plugins/data_views/public';
import { createFilterManagerMock } from 'src/plugins/data/public/query/filter_manager/filter_manager.mock';
import { ViewMode } from 'src/plugins/embeddable/public';

const applicationMock = createStartContractMock();
const savedSearch = savedSearchMock;
const indexPatterns = [] as DataView[];
const services = discoverServiceMock;
const filterManager = createFilterManagerMock();
const searchInput = {
  timeRange: {
    from: '2021-09-15',
    to: '2021-09-16',
  },
  id: '1',
  viewMode: ViewMode.VIEW,
};
const executeTriggerActions = async (triggerId: string, context: object) => {
  return Promise.resolve(undefined);
};
const trigger = { id: 'ACTION_VIEW_SAVED_SEARCH' };
const embeddableConfig = {
  savedSearch,
  editUrl: '',
  editPath: '',
  indexPatterns,
  editable: true,
  filterManager,
  services,
};

describe('view saved search action', () => {
  it('is compatible when embeddable is of type saved search, in view mode && appropriate permissions are set', async () => {
    const action = new ViewSavedSearchAction(applicationMock);
    const embeddable = new SavedSearchEmbeddable(
      embeddableConfig,
      searchInput,
      executeTriggerActions
    );
    expect(await action.isCompatible({ embeddable, trigger })).toBe(true);
  });

  it('is not compatible when embeddable not of type saved search', async () => {
    const action = new ViewSavedSearchAction(applicationMock);
    const embeddable = new ContactCardEmbeddable(
      {
        id: '123',
        firstName: 'sue',
        viewMode: ViewMode.EDIT,
      },
      {
        execAction: () => Promise.resolve(undefined),
      }
    );
    expect(
      await action.isCompatible({
        embeddable,
        trigger,
      })
    ).toBe(false);
  });

  it('is not visible when in edit mode', async () => {
    const action = new ViewSavedSearchAction(applicationMock);
    const input = { ...searchInput, viewMode: ViewMode.EDIT };
    const embeddable = new SavedSearchEmbeddable(embeddableConfig, input, executeTriggerActions);
    expect(
      await action.isCompatible({
        embeddable,
        trigger,
      })
    ).toBe(false);
  });

  it('execute navigates to a saved search', async () => {
    const action = new ViewSavedSearchAction(applicationMock);
    const embeddable = new SavedSearchEmbeddable(
      embeddableConfig,
      searchInput,
      executeTriggerActions
    );
    await action.execute({ embeddable, trigger });
    expect(applicationMock.navigateToApp).toHaveBeenCalledWith('discover', {
      path: `#/view/${savedSearch.id}`,
    });
  });
});
