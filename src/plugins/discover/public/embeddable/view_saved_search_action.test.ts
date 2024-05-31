/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContactCardEmbeddable } from '@kbn/embeddable-plugin/public/lib/test_samples';
import { ViewSavedSearchAction } from './view_saved_search_action';
import { SavedSearchEmbeddable } from './saved_search_embeddable';
import { createStartContractMock } from '../__mocks__/start_contract';
import { discoverServiceMock } from '../__mocks__/services';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { getDiscoverLocatorParams } from './get_discover_locator_params';

const applicationMock = createStartContractMock();
const services = discoverServiceMock;
const searchInput = {
  timeRange: {
    from: '2021-09-15',
    to: '2021-09-16',
  },
  id: '1',
  savedObjectId: 'mock-saved-object-id',
  viewMode: ViewMode.VIEW,
};
const executeTriggerActions = async (triggerId: string, context: object) => {
  return Promise.resolve(undefined);
};
const embeddableConfig = {
  editable: true,
  services,
  executeTriggerActions,
};

describe('view saved search action', () => {
  it('is compatible when embeddable is of type saved search, in view mode && appropriate permissions are set', async () => {
    const action = new ViewSavedSearchAction(applicationMock, services.locator);
    const embeddable = new SavedSearchEmbeddable(embeddableConfig, searchInput);
    expect(await action.isCompatible({ embeddable })).toBe(true);
  });

  it('is not compatible when embeddable not of type saved search', async () => {
    const action = new ViewSavedSearchAction(applicationMock, services.locator);
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
      })
    ).toBe(false);
  });

  it('is not visible when in edit mode', async () => {
    const action = new ViewSavedSearchAction(applicationMock, services.locator);
    const input = { ...searchInput, viewMode: ViewMode.EDIT };
    const embeddable = new SavedSearchEmbeddable(embeddableConfig, input);
    expect(
      await action.isCompatible({
        embeddable,
      })
    ).toBe(false);
  });

  it('execute navigates to a saved search', async () => {
    const action = new ViewSavedSearchAction(applicationMock, services.locator);
    const embeddable = new SavedSearchEmbeddable(embeddableConfig, searchInput);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await action.execute({ embeddable });
    expect(discoverServiceMock.locator.navigate).toHaveBeenCalledWith(
      getDiscoverLocatorParams(embeddable)
    );
  });
});
