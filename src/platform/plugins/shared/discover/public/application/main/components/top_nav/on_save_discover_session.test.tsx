/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { savedSearchMock, savedSearchMockWithTimeField } from '../../../../__mocks__/saved_search';
import type {
  DiscoverSessionSaveModalOnSaveCallback,
  DiscoverSessionSaveModalProps,
  OnSaveDiscoverSessionParams,
} from './on_save_discover_session';
import { onSaveDiscoverSession } from './on_save_discover_session';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import type { SavedSearch, SavedSearchPublicPluginStart } from '@kbn/saved-search-plugin/public';
import type { ReactElement } from 'react';
import type { DiscoverServices } from '../../../../build_services';
import type { showSaveModal } from '@kbn/saved-objects-plugin/public';

const mockShowSaveModal: jest.MockedFunction<typeof showSaveModal> = jest.fn();

jest.mock('@kbn/saved-objects-plugin/public', () => ({
  ...jest.requireActual('@kbn/saved-objects-plugin/public'),
  showSaveModal: (...params: Parameters<typeof showSaveModal>) => mockShowSaveModal(...params),
}));

type OnSaveProps = Parameters<DiscoverSessionSaveModalOnSaveCallback>[0];

const getOnSaveProps = (props?: Partial<OnSaveProps>): OnSaveProps => ({
  newTitle: 'title',
  newCopyOnSave: false,
  newDescription: 'description',
  newTimeRestore: false,
  newTags: [],
  isTitleDuplicateConfirmed: false,
  onTitleDuplicate: jest.fn(),
  ...props,
});

const setup = async ({
  savedSearch = savedSearchMock,
  services = createDiscoverServicesMock(),
  mockSaveDiscoverSession = (discoverSession) => {
    return Promise.resolve({
      ...discoverSession,
      id: discoverSession.id ?? 'new-session',
      managed: false,
    });
  },
  onSaveCb,
}: {
  savedSearch?: SavedSearch | false;
  services?: DiscoverServices;
  mockSaveDiscoverSession?: SavedSearchPublicPluginStart['saveDiscoverSession'];
  onSaveCb?: OnSaveDiscoverSessionParams['onSaveCb'];
} = {}) => {
  jest
    .spyOn(services.savedSearch, 'saveDiscoverSession')
    .mockImplementation(mockSaveDiscoverSession);
  const stateContainer = getDiscoverStateMock({ savedSearch, services });
  if (savedSearch) {
    stateContainer.actions.setDataView(savedSearch.searchSource.getField('index')!);
  }
  let saveModal: ReactElement<DiscoverSessionSaveModalProps> | undefined;
  mockShowSaveModal.mockImplementation((modal) => {
    saveModal = modal as ReactElement<DiscoverSessionSaveModalProps>;
  });
  await onSaveDiscoverSession({
    services,
    state: stateContainer,
    onSaveCb,
  });
  return { stateContainer, saveModal };
};

describe('onSaveDiscoverSession', () => {
  beforeEach(() => {
    mockShowSaveModal.mockReset();
  });

  it('should call showSaveModal', async () => {
    const { saveModal } = await setup();
    expect(saveModal).toBeDefined();
  });

  it('should consider whether a data view is time based', async () => {
    let { saveModal } = await setup();
    expect(saveModal?.props.isTimeBased).toBe(false);
    ({ saveModal } = await setup({
      savedSearch: savedSearchMockWithTimeField,
    }));
    expect(saveModal?.props.isTimeBased).toBe(true);
  });

  it('should pass tags to the save modal', async () => {
    const { saveModal } = await setup({
      savedSearch: {
        ...savedSearchMock,
        tags: ['tag1', 'tag2'],
      },
    });
    expect(saveModal?.props.tags).toEqual(['tag1', 'tag2']);
  });

  it('should update tags if savedObjectsTagging is defined', async () => {
    const savedSearch: SavedSearch = {
      ...savedSearchMock,
      tags: ['tag1', 'tag2'],
    };
    const { stateContainer, saveModal } = await setup({ savedSearch });
    await saveModal?.props.onSave(getOnSaveProps({ newTags: ['tag3', 'tag4'] }));
    expect(stateContainer.savedSearchState.getCurrent$().getValue().tags).toEqual(['tag3', 'tag4']);
  });

  it('should not update tags if savedObjectsTagging is undefined', async () => {
    const savedSearch: SavedSearch = {
      ...savedSearchMock,
      tags: ['tag1', 'tag2'],
    };
    const { stateContainer, saveModal } = await setup({
      savedSearch,
      services: { ...createDiscoverServicesMock(), savedObjectsTagging: undefined },
    });
    await saveModal?.props.onSave(getOnSaveProps({ newTags: ['tag3', 'tag4'] }));
    expect(stateContainer.savedSearchState.getCurrent$().getValue().tags).toEqual(['tag1', 'tag2']);
  });

  it('should return the Discover session ID on save', async () => {
    const { saveModal } = await setup({ savedSearch: savedSearchMock });
    const result = await saveModal?.props.onSave(getOnSaveProps());
    expect(result).toEqual({ id: savedSearchMock.id });
  });

  it('should call onSaveCb on save if provided', async () => {
    const onSaveCb = jest.fn();
    let { saveModal } = await setup({ savedSearch: savedSearchMock, onSaveCb });
    await saveModal?.props.onSave(getOnSaveProps());
    expect(onSaveCb).toHaveBeenCalledTimes(1);
    ({ saveModal } = await setup({ savedSearch: false, onSaveCb }));
    await saveModal?.props.onSave(getOnSaveProps());
    expect(onSaveCb).toHaveBeenCalledTimes(2);
  });

  it('should navigate to new Discover session on save if onSaveCb is not provided', async () => {
    const services = createDiscoverServicesMock();
    const navigateSpy = jest.spyOn(services.locator, 'navigate');
    let { saveModal } = await setup({ services });
    await saveModal?.props.onSave(getOnSaveProps());
    expect(navigateSpy).not.toHaveBeenCalled();
    ({ saveModal } = await setup({
      savedSearch: false,
      services,
    }));
    await saveModal?.props.onSave(getOnSaveProps());
    expect(navigateSpy).toHaveBeenCalledWith({ savedSearchId: 'new-session' });
  });

  it('should show a success toast on save', async () => {
    const services = createDiscoverServicesMock();
    const successSpy = jest.spyOn(services.toastNotifications, 'addSuccess');
    const { saveModal } = await setup({ services });
    await saveModal?.props.onSave(getOnSaveProps());
    expect(successSpy).toHaveBeenCalledWith({
      title: "Discover session 'title' was saved",
      'data-test-subj': 'saveSearchSuccess',
    });
  });

  it('should show a danger toast on error', async () => {
    const services = createDiscoverServicesMock();
    const dangerSpy = jest.spyOn(services.toastNotifications, 'addDanger');
    const { saveModal } = await setup({
      services,
      mockSaveDiscoverSession: () => Promise.reject(new Error('Save error')),
    });
    await saveModal?.props.onSave(getOnSaveProps());
    expect(dangerSpy).toHaveBeenCalledWith({
      title: "Discover session 'title' was not saved",
      text: 'Save error',
    });
  });

  it('should show no toast when save is unsuccessful without an error', async () => {
    const services = createDiscoverServicesMock();
    const successSpy = jest.spyOn(services.toastNotifications, 'addSuccess');
    const dangerSpy = jest.spyOn(services.toastNotifications, 'addDanger');
    const { saveModal } = await setup({
      services,
      mockSaveDiscoverSession: () => Promise.resolve(undefined),
    });
    await saveModal?.props.onSave(getOnSaveProps());
    expect(successSpy).not.toHaveBeenCalled();
    expect(dangerSpy).not.toHaveBeenCalled();
  });
});
