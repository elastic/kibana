/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { BehaviorSubject } from 'rxjs';
import { discoverServiceMock } from '../../__mocks__/services';
import { createStartContractMock } from '../../__mocks__/start_contract';
import { getSearchEmbeddableFactory } from '../get_search_embeddable_factory';
import { SearchEmbeddableApi } from '../types';
import { getDiscoverLocatorParams } from '../utils/get_discover_locator_params';
import { ViewSavedSearchAction } from './view_saved_search_action';

const applicationMock = createStartContractMock();
const services = discoverServiceMock;
const initialState = {
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

describe('view saved search action', () => {
  let searchApi: SearchEmbeddableApi;

  beforeAll(async () => {
    const factory = getSearchEmbeddableFactory({
      startServices: { executeTriggerActions },
      discoverServices: services,
    });

    ({ api: searchApi } = await factory.buildEmbeddable(
      initialState,
      (api) =>
        ({
          uuid: 'test',
          type: SEARCH_EMBEDDABLE_TYPE,
          viewMode: new BehaviorSubject(ViewMode.VIEW),
          unsavedChanges: new BehaviorSubject({}),
          resetUnsavedChanges: jest.fn(),
          ...api,
        } as SearchEmbeddableApi),
      'test'
    ));
  });

  it('is compatible when embeddable is of type saved search, in view mode && appropriate permissions are set', async () => {
    const action = new ViewSavedSearchAction(applicationMock, services.locator);
    expect(await action.isCompatible({ embeddable: searchApi })).toBe(true);
  });

  it('is not compatible when embeddable not of type saved search', async () => {
    const action = new ViewSavedSearchAction(applicationMock, services.locator);
    expect(
      await action.isCompatible({
        embeddable: { ...searchApi, type: 'CONTACT_CARD_EMBEDDABLE' },
      })
    ).toBe(false);
  });

  it('is not visible when in edit mode', async () => {
    const action = new ViewSavedSearchAction(applicationMock, services.locator);
    expect(
      await action.isCompatible({
        embeddable: { ...searchApi, viewMode: new BehaviorSubject(ViewMode.EDIT) },
      })
    ).toBe(false);
  });

  it('execute navigates to a saved search', async () => {
    const action = new ViewSavedSearchAction(applicationMock, services.locator);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await action.execute({ embeddable: searchApi });
    expect(discoverServiceMock.locator.navigate).toHaveBeenCalledWith(
      getDiscoverLocatorParams(searchApi)
    );
  });
});
