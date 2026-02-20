/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  savedSearchMock,
  savedSearchMockWithTimeField,
} from '../../../../../__mocks__/saved_search';
import type {
  DiscoverSessionSaveModalOnSaveCallback,
  DiscoverSessionSaveModalProps,
} from './save_modal';
import type { OnSaveDiscoverSessionParams } from './on_save_discover_session';
import { onSaveDiscoverSession } from './on_save_discover_session';
import { getDiscoverStateMock } from '../../../../../__mocks__/discover_state.mock';
import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import type { SavedSearch, SavedSearchPublicPluginStart } from '@kbn/saved-search-plugin/public';
import type { ReactElement } from 'react';
import type { DiscoverServices } from '../../../../../build_services';
import { showSaveModal } from '@kbn/saved-objects-plugin/public';
import {
  fromTabStateToSavedObjectTab,
  internalStateActions,
} from '../../../state_management/redux';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { getTabStateMock } from '../../../state_management/redux/__mocks__/internal_state.mocks';
import type { DataView, DataViewListItem } from '@kbn/data-views-plugin/common';
import { dataViewMock, dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';

const mockShowSaveModal = jest.mocked(showSaveModal);

jest.mock('@kbn/saved-objects-plugin/public', () => ({
  ...jest.requireActual('@kbn/saved-objects-plugin/public'),
  showSaveModal: jest.fn(),
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
  additionalPersistedTabs,
  dataViewsList,
  services = createDiscoverServicesMock(),
  mockSaveDiscoverSession = (discoverSession) => {
    return Promise.resolve({
      ...discoverSession,
      id: discoverSession.id ?? 'new-session',
      managed: false,
    });
  },
  onSaveCb,
  onClose,
}: {
  savedSearch?: SavedSearch | false;
  additionalPersistedTabs?: DiscoverSessionTab[];
  dataViewsList?: DataView[];
  services?: DiscoverServices;
  mockSaveDiscoverSession?: SavedSearchPublicPluginStart['saveDiscoverSession'];
  onSaveCb?: OnSaveDiscoverSessionParams['onSaveCb'];
  onClose?: OnSaveDiscoverSessionParams['onClose'];
} = {}) => {
  jest
    .spyOn(services.savedSearch, 'saveDiscoverSession')
    .mockImplementation(mockSaveDiscoverSession);
  const stateContainer = getDiscoverStateMock({
    savedSearch,
    additionalPersistedTabs,
    services,
  });
  if (dataViewsList) {
    stateContainer.internalState.dispatch(
      internalStateActions.loadDataViewList.fulfilled(
        dataViewsList as DataViewListItem[],
        'requestId'
      )
    );
  }
  let saveModal: ReactElement<DiscoverSessionSaveModalProps> | undefined;
  mockShowSaveModal.mockImplementation((modal) => {
    saveModal = modal as ReactElement<DiscoverSessionSaveModalProps>;
  });
  await onSaveDiscoverSession({
    services,
    state: stateContainer,
    onSaveCb,
    onClose,
  });
  return { stateContainer, saveModal };
};

describe('onSaveDiscoverSession', () => {
  beforeEach(() => {
    mockShowSaveModal.mockReset();
  });

  describe('By Value', () => {
    it('should skip the modal and immediately save and return the serialisable state', async () => {
      const services = createDiscoverServicesMock();
      jest.spyOn(services.embeddableEditor, 'isByValueEditor').mockReturnValue(true);
      jest
        .spyOn(services.embeddableEditor, 'getByValueInput')
        .mockReturnValue({ id: 'mock-session' } as DiscoverSessionTab);
      jest.spyOn(services.embeddableEditor, 'isEmbeddedEditor').mockReturnValue(true);

      const onSaveCb = jest.fn();

      const { saveModal } = await setup({
        savedSearch: {
          ...savedSearchMock,
          managed: true,
        },
        onSaveCb,
        services,
      });

      expect(saveModal).not.toBeDefined();
      expect(onSaveCb).toHaveBeenCalledTimes(1);
      expect(onSaveCb).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('By Reference', () => {
    it('should call showSaveModal and set expected props', async () => {
      const services = createDiscoverServicesMock();
      const { saveModal } = await setup({
        savedSearch: {
          ...savedSearchMock,
          managed: true,
        },
        services,
      });
      expect(saveModal).toBeDefined();
      expect(saveModal?.props).toEqual({
        isTimeBased: false,
        services,
        title: 'A saved search',
        showCopyOnSave: true,
        description: 'description',
        timeRestore: false,
        tags: [],
        onSave: expect.any(Function),
        onClose: expect.any(Function),
        managed: true,
      });
    });

    describe('isTimeBased checks', () => {
      const services = createDiscoverServicesMock();
      const dataViewNoTimeFieldTab = fromTabStateToSavedObjectTab({
        tab: getTabStateMock({
          id: 'dataViewNoTimeFieldTab',
          initialInternalState: {
            serializedSearchSource: { index: dataViewMock.id },
          },
        }),
        services,
      });
      const dataViewWithTimeFieldTab = fromTabStateToSavedObjectTab({
        tab: getTabStateMock({
          id: 'dataViewWithTimeFieldTab',
          initialInternalState: {
            serializedSearchSource: { index: dataViewMockWithTimeField.id },
          },
        }),
        services,
      });
      const adHocDataViewNoTimeFieldTab = fromTabStateToSavedObjectTab({
        tab: getTabStateMock({
          id: 'adHocDataViewNoTimeFieldTab',
          initialInternalState: {
            serializedSearchSource: { index: { title: 'adhoc' } },
          },
        }),
        services,
      });
      const adHocDataViewWithTimeFieldTab = fromTabStateToSavedObjectTab({
        tab: getTabStateMock({
          id: 'adHocDataViewWithTimeFieldTab',
          initialInternalState: {
            serializedSearchSource: { index: { title: 'adhoc', timeFieldName: 'timestamp' } },
          },
          attributes: {
            timeRestore: true,
          },
        }),
        services,
      });

      it("should set isTimeBased to false if no tab's data view is time based", async () => {
        const { saveModal } = await setup({
          additionalPersistedTabs: [dataViewNoTimeFieldTab, adHocDataViewNoTimeFieldTab],
          dataViewsList: [dataViewMock],
          services,
        });
        expect(saveModal?.props.isTimeBased).toBe(false);
      });

      it.each([
        [
          'initialized tab',
          {
            savedSearch: savedSearchMockWithTimeField,
            additionalPersistedTabs: [dataViewNoTimeFieldTab, adHocDataViewNoTimeFieldTab],
            dataViewsList: [dataViewMock],
          },
        ],
        [
          'uninitialized tab with persisted data view',
          {
            additionalPersistedTabs: [dataViewWithTimeFieldTab, adHocDataViewNoTimeFieldTab],
            dataViewsList: [dataViewMockWithTimeField],
          },
        ],
        [
          'uninitialized tab with ad hoc data view',
          {
            additionalPersistedTabs: [dataViewNoTimeFieldTab, adHocDataViewWithTimeFieldTab],
            dataViewsList: [dataViewMock],
          },
        ],
      ])(
        "should set isTimeBased to true if any tab's data view is time based - %s",
        async (_, setupArgs) => {
          const { saveModal } = await setup({ ...setupArgs, services });
          expect(saveModal?.props.isTimeBased).toBe(true);
        }
      );
    });

    it("should set timeRestore to true if any tab's timeRestore is true", async () => {
      const services = createDiscoverServicesMock();
      const noTimeRestoreTab = fromTabStateToSavedObjectTab({
        tab: getTabStateMock({ id: 'noTimeRestoreTab', attributes: { timeRestore: false } }),
        services,
      });
      const timeRestoreTab = fromTabStateToSavedObjectTab({
        tab: getTabStateMock({ id: 'timeRestoreTab', attributes: { timeRestore: true } }),
        services,
      });
      let { saveModal } = await setup({
        additionalPersistedTabs: [noTimeRestoreTab],
        services,
      });
      expect(saveModal?.props.timeRestore).toBe(false);
      ({ saveModal } = await setup({
        additionalPersistedTabs: [timeRestoreTab],
        services,
      }));
      expect(saveModal?.props.timeRestore).toBe(true);
    });

    it('should set showCopyOnSave to true if a persisted Discover session exists', async () => {
      const services = createDiscoverServicesMock();
      let { saveModal } = await setup({ services, savedSearch: false });
      expect(saveModal?.props.showCopyOnSave).toBe(false);
      ({ saveModal } = await setup({ services }));
      expect(saveModal?.props.showCopyOnSave).toBe(true);
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
      expect(stateContainer.savedSearchState.getCurrent$().getValue().tags).toEqual([
        'tag3',
        'tag4',
      ]);
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
      expect(stateContainer.savedSearchState.getCurrent$().getValue().tags).toEqual([
        'tag1',
        'tag2',
      ]);
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
      expect(navigateSpy).toHaveBeenCalledWith({
        savedSearchId: 'new-session',
        tab: {
          id: 'stable-test-initial-tab-id',
        },
      });
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

    it('should call onClose when closed if provided', async () => {
      const onClose = jest.fn();
      const { saveModal } = await setup({ onClose });
      saveModal?.props.onClose();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
