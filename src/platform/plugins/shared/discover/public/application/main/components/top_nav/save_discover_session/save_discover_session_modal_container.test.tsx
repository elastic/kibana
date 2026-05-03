/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import type { DiscoverSessionSaveDashboardModalProps } from './discover_session_save_dashboard_modal';
import { DiscoverSessionSaveDashboardModal } from './discover_session_save_dashboard_modal';
import { DiscoverSessionSaveModalContainer } from './save_discover_session_modal_container';
import { getDiscoverInternalStateMock } from '../../../../../__mocks__/discover_state.mock';
import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import type { SavedSearchPublicPluginStart } from '@kbn/saved-search-plugin/public';
import type { DiscoverServices } from '../../../../../build_services';
import {
  fromTabStateToSavedObjectTab,
  internalStateActions,
} from '../../../state_management/redux';
import type { DiscoverSession, DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import {
  getPersistedTabMock,
  getTabStateMock,
} from '../../../state_management/redux/__mocks__/internal_state.mocks';
import type { DataView, DataViewListItem } from '@kbn/data-views-plugin/common';
import { dataViewMock, dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import { dataViewWithTimefieldMock } from '../../../../../__mocks__/data_view_with_timefield';
import { TransferAction } from '../../../../../plugin_imports/embeddable_editor_service';
import { DiscoverToolkitTestProvider } from '../../../../../__mocks__/test_provider';

jest.mock('./discover_session_save_dashboard_modal', () => ({
  DiscoverSessionSaveDashboardModal: jest.fn(() => null),
}));

const MockModal = jest.mocked(DiscoverSessionSaveDashboardModal);

const defaultServices = createDiscoverServicesMock();

const defaultPersistedDiscoverSession = createDiscoverSessionMock({
  description: 'description',
  id: 'the-saved-search-id',
  managed: false,
  tags: [],
  tabs: [
    getPersistedTabMock({
      dataView: dataViewMock,
      services: defaultServices,
      tabId: 'the-saved-search-id',
    }),
  ],
  title: 'A saved search',
});

const getOnSaveProps = (
  props?: Partial<Parameters<DiscoverSessionSaveDashboardModalProps['onSave']>[0]>
): Parameters<DiscoverSessionSaveDashboardModalProps['onSave']>[0] => ({
  isTitleDuplicateConfirmed: false,
  newCopyOnSave: false,
  newDescription: 'description',
  newTags: [],
  newTimeRestore: false,
  newTitle: 'title',
  onTitleDuplicate: jest.fn(),
  ...props,
});

const setup = async ({
  additionalPersistedTabs,
  dataViewsList,
  initialCopyOnSave,
  initialTabDataView,
  isEmbedded = false,
  mockSaveDiscoverSession = (discoverSession) => {
    return Promise.resolve({
      ...discoverSession,
      id: discoverSession.id ?? 'new-session',
      managed: false,
    });
  },
  onSaveCb,
  persistedDiscoverSession = defaultPersistedDiscoverSession,
  services = createDiscoverServicesMock(),
}: {
  additionalPersistedTabs?: DiscoverSessionTab[];
  dataViewsList?: DataView[];
  initialCopyOnSave?: boolean;
  initialTabDataView?: DataView;
  isEmbedded?: boolean;
  mockSaveDiscoverSession?: SavedSearchPublicPluginStart['saveDiscoverSession'];
  onSaveCb?: () => void;
  persistedDiscoverSession?: DiscoverSession | false;
  services?: DiscoverServices;
} = {}) => {
  const finalPersistedSession =
    persistedDiscoverSession === false
      ? undefined
      : additionalPersistedTabs
      ? {
          ...persistedDiscoverSession,
          tabs: [...persistedDiscoverSession.tabs, ...additionalPersistedTabs],
        }
      : persistedDiscoverSession;

  const allDataViews = [
    ...(initialTabDataView ? [initialTabDataView] : []),
    ...(dataViewsList ?? []),
    dataViewMock,
    dataViewMockWithTimeField,
    dataViewWithTimefieldMock,
  ];
  const uniqueDataViews = allDataViews.filter(
    (dv, index, self) => self.findIndex((d) => d.id === dv.id) === index
  );

  if (isEmbedded) {
    jest.spyOn(services.embeddableEditor, 'isEmbeddedEditor').mockReturnValue(true);
  }

  const toolkit = getDiscoverInternalStateMock({
    services,
    persistedDataViews: uniqueDataViews,
  });

  jest
    .spyOn(services.savedSearch, 'saveDiscoverSession')
    .mockImplementation(mockSaveDiscoverSession);

  await toolkit.initializeTabs({ persistedDiscoverSession: finalPersistedSession });
  await toolkit.initializeSingleTab({ tabId: toolkit.getCurrentTab().id });

  if (initialTabDataView) {
    toolkit.internalState.dispatch(
      internalStateActions.setDataView({
        tabId: toolkit.getCurrentTab().id,
        dataView: initialTabDataView,
      })
    );
  }

  if (dataViewsList) {
    toolkit.internalState.dispatch(
      internalStateActions.loadDataViewList.fulfilled(
        dataViewsList as DataViewListItem[],
        'requestId'
      )
    );
  }

  MockModal.mockClear();

  const onClose = jest.fn();

  render(
    <DiscoverToolkitTestProvider toolkit={toolkit}>
      <DiscoverSessionSaveModalContainer
        initialCopyOnSave={initialCopyOnSave}
        onClose={onClose}
        onSaveCb={onSaveCb}
        services={services}
      />
    </DiscoverToolkitTestProvider>
  );

  const modalProps: DiscoverSessionSaveDashboardModalProps | undefined = MockModal.mock.calls.length
    ? (MockModal.mock.calls[0][0] as unknown as DiscoverSessionSaveDashboardModalProps)
    : undefined;

  return { modalProps, onClose, toolkit };
};

describe('DiscoverSessionSaveModalContainer', () => {
  beforeEach(() => {
    MockModal.mockClear();
  });

  describe('hideDashboardOptions', () => {
    it('should hide dashboard options for embedded editor save', async () => {
      const { modalProps } = await setup({ isEmbedded: true });
      expect(modalProps?.hideDashboardOptions).toBe(true);
    });

    it('should show dashboard options for embedded editor Save As', async () => {
      const { modalProps } = await setup({ isEmbedded: true, initialCopyOnSave: true });
      expect(modalProps?.hideDashboardOptions).toBe(false);
    });

    it('should hide dashboard options when saving an existing session (non-embedded)', async () => {
      const { modalProps } = await setup({});
      expect(modalProps?.hideDashboardOptions).toBe(true);
    });

    it('should show dashboard options for Save As (non-embedded)', async () => {
      const { modalProps } = await setup({ initialCopyOnSave: true });
      expect(modalProps?.hideDashboardOptions).toBe(false);
    });

    it('should show dashboard options for a new session (non-embedded)', async () => {
      const { modalProps } = await setup({ persistedDiscoverSession: false });
      expect(modalProps?.hideDashboardOptions).toBe(false);
    });
  });

  describe('props', () => {
    it('should set expected props for embedded editor', async () => {
      const services = createDiscoverServicesMock();

      const { modalProps } = await setup({
        isEmbedded: true,
        persistedDiscoverSession: {
          ...defaultPersistedDiscoverSession,
          managed: true,
        },
        services,
      });

      expect(modalProps).toEqual({
        description: 'description',
        hideDashboardOptions: true,
        initialTags: [],
        initialTimeRestore: false,
        isTimeBased: false,
        managed: true,
        onClose: expect.any(Function),
        onCopyOnSaveChange: expect.any(Function),
        onSave: expect.any(Function),
        savedObjectsTagging: services.savedObjectsTagging,
        sessionId: 'the-saved-search-id',
        title: 'A saved search',
      });
    });

    it('should set expected props when saving an existing session', async () => {
      const services = createDiscoverServicesMock();

      const { modalProps } = await setup({
        persistedDiscoverSession: {
          ...defaultPersistedDiscoverSession,
          managed: true,
        },
        services,
      });

      expect(modalProps).toEqual({
        description: 'description',
        hideDashboardOptions: true,
        initialTags: [],
        initialTimeRestore: false,
        isTimeBased: false,
        managed: true,
        onClose: expect.any(Function),
        onCopyOnSaveChange: expect.any(Function),
        onSave: expect.any(Function),
        savedObjectsTagging: services.savedObjectsTagging,
        sessionId: 'the-saved-search-id',
        title: 'A saved search',
      });
    });

    it('should set expected props for Save As', async () => {
      const services = createDiscoverServicesMock();

      const { modalProps } = await setup({
        initialCopyOnSave: true,
        persistedDiscoverSession: {
          ...defaultPersistedDiscoverSession,
          managed: true,
        },
        services,
      });

      expect(modalProps).toEqual({
        description: 'description',
        hideDashboardOptions: false,
        initialTags: [],
        initialTimeRestore: false,
        isTimeBased: false,
        managed: true,
        onClose: expect.any(Function),
        onCopyOnSaveChange: expect.any(Function),
        onSave: expect.any(Function),
        savedObjectsTagging: services.savedObjectsTagging,
        sessionId: undefined,
        title: 'A saved search',
      });
    });

    it('should set expected props for a new session', async () => {
      const services = createDiscoverServicesMock();

      const { modalProps } = await setup({
        persistedDiscoverSession: false,
        services,
      });

      expect(modalProps).toEqual({
        description: undefined,
        hideDashboardOptions: false,
        initialTags: [],
        initialTimeRestore: false,
        isTimeBased: false,
        managed: false,
        onClose: expect.any(Function),
        onCopyOnSaveChange: expect.any(Function),
        onSave: expect.any(Function),
        savedObjectsTagging: services.savedObjectsTagging,
        sessionId: undefined,
        title: '',
      });
    });

    it('should set sessionId to undefined for Save As and new sessions', async () => {
      const { modalProps: saveAsProps } = await setup({ initialCopyOnSave: true });
      expect(saveAsProps?.sessionId).toBeUndefined();

      const { modalProps: newSessionProps } = await setup({ persistedDiscoverSession: false });
      expect(newSessionProps?.sessionId).toBeUndefined();
    });

    it('should set sessionId to persisted session id for existing sessions', async () => {
      const { modalProps } = await setup({});
      expect(modalProps?.sessionId).toBe('the-saved-search-id');

      const { modalProps: embeddedProps } = await setup({ isEmbedded: true });
      expect(embeddedProps?.sessionId).toBe('the-saved-search-id');
    });

    it('should pass initialTags from persisted session', async () => {
      const { modalProps } = await setup({
        initialCopyOnSave: true,
        persistedDiscoverSession: {
          ...defaultPersistedDiscoverSession,
          tags: ['tag1', 'tag2'],
        },
      });
      expect(modalProps?.initialTags).toEqual(['tag1', 'tag2']);
    });

    describe('isTimeBased checks', () => {
      const services = createDiscoverServicesMock();

      const dataViewNoTimeFieldTab = fromTabStateToSavedObjectTab({
        currentDataView: dataViewMock,
        services,
        tab: getTabStateMock({
          id: 'dataViewNoTimeFieldTab',
          initialInternalState: {
            serializedSearchSource: { index: dataViewMock.id },
          },
        }),
      });

      const dataViewWithTimeFieldTab = fromTabStateToSavedObjectTab({
        currentDataView: dataViewMockWithTimeField,
        services,
        tab: getTabStateMock({
          id: 'dataViewWithTimeFieldTab',
          initialInternalState: {
            serializedSearchSource: { index: dataViewMockWithTimeField.id },
          },
        }),
      });

      const adHocDataViewNoTimeFieldTab = fromTabStateToSavedObjectTab({
        currentDataView: undefined,
        services,
        tab: getTabStateMock({
          id: 'adHocDataViewNoTimeFieldTab',
          initialInternalState: {
            serializedSearchSource: { index: { title: 'adhoc' } },
          },
        }),
      });

      const adHocDataViewWithTimeFieldTab = fromTabStateToSavedObjectTab({
        currentDataView: undefined,
        services,
        tab: getTabStateMock({
          id: 'adHocDataViewWithTimeFieldTab',
          initialInternalState: {
            serializedSearchSource: { index: { title: 'adhoc', timeFieldName: 'timestamp' } },
          },
          attributes: {
            timeRestore: true,
          },
        }),
      });

      it("should set isTimeBased to false if no tab's data view is time based", async () => {
        const { modalProps } = await setup({
          additionalPersistedTabs: [dataViewNoTimeFieldTab, adHocDataViewNoTimeFieldTab],
          dataViewsList: [dataViewMock],
          isEmbedded: true,
          services,
        });
        expect(modalProps?.isTimeBased).toBe(false);
      });

      it.each([
        [
          'initialized tab',
          {
            additionalPersistedTabs: [dataViewNoTimeFieldTab, adHocDataViewNoTimeFieldTab],
            dataViewsList: [dataViewMock],
            initialTabDataView: dataViewWithTimefieldMock,
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
          const { modalProps } = await setup({ ...setupArgs, services, isEmbedded: true });
          expect(modalProps?.isTimeBased).toBe(true);
        }
      );
    });

    it("should set initialTimeRestore to true if any tab's timeRestore is true", async () => {
      const services = createDiscoverServicesMock();

      const noTimeRestoreTab = fromTabStateToSavedObjectTab({
        currentDataView: dataViewMock,
        services,
        tab: getTabStateMock({ id: 'noTimeRestoreTab', attributes: { timeRestore: false } }),
      });

      const timeRestoreTab = fromTabStateToSavedObjectTab({
        currentDataView: dataViewMock,
        services,
        tab: getTabStateMock({ id: 'timeRestoreTab', attributes: { timeRestore: true } }),
      });

      let { modalProps } = await setup({
        additionalPersistedTabs: [noTimeRestoreTab],
        isEmbedded: true,
        services,
      });
      expect(modalProps?.initialTimeRestore).toBe(false);

      ({ modalProps } = await setup({
        additionalPersistedTabs: [timeRestoreTab],
        isEmbedded: true,
        services,
      }));
      expect(modalProps?.initialTimeRestore).toBe(true);
    });
  });

  describe('save behavior', () => {
    it('should update tags if savedObjectsTagging is defined', async () => {
      const { modalProps, toolkit } = await setup({ isEmbedded: true });

      await act(async () => {
        await modalProps?.onSave(getOnSaveProps({ newTags: ['tag3', 'tag4'] }));
      });

      expect(toolkit.internalState.getState().persistedDiscoverSession?.tags).toEqual([
        'tag3',
        'tag4',
      ]);
    });

    it('should not update tags if savedObjectsTagging is undefined', async () => {
      const { modalProps, toolkit } = await setup({
        isEmbedded: true,
        persistedDiscoverSession: {
          ...defaultPersistedDiscoverSession,
          tags: ['tag1', 'tag2'],
        },
        services: { ...createDiscoverServicesMock(), savedObjectsTagging: undefined },
      });

      await act(async () => {
        await modalProps?.onSave(getOnSaveProps({ newTags: ['tag3', 'tag4'] }));
      });

      expect(toolkit.internalState.getState().persistedDiscoverSession?.tags).toEqual([
        'tag1',
        'tag2',
      ]);
    });

    it('should call transferBackToEditor on save for embedded editor', async () => {
      const services = createDiscoverServicesMock();
      const transferSpy = jest.spyOn(services.embeddableEditor, 'transferBackToEditor');
      const { modalProps } = await setup({ isEmbedded: true, services });

      await act(async () => {
        await modalProps?.onSave(getOnSaveProps());
      });

      expect(transferSpy).toHaveBeenCalledWith(TransferAction.SaveSession);
    });

    it('should navigate to new session on Save As from embedded editor', async () => {
      const services = createDiscoverServicesMock();
      const transferSpy = jest.spyOn(services.embeddableEditor, 'transferBackToEditor');
      const clearEditorStateSpy = jest.spyOn(services.embeddableEditor, 'clearEditorState');
      const navigateSpy = jest.spyOn(services.locator, 'navigate');
      const { modalProps, onClose } = await setup({
        initialCopyOnSave: true,
        isEmbedded: true,
        services,
      });

      await act(async () => {
        await modalProps?.onSave(
          getOnSaveProps({
            dashboardId: null,
            newCopyOnSave: true,
          })
        );
      });

      expect(transferSpy).not.toHaveBeenCalled();
      expect(clearEditorStateSpy).toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ savedSearchId: 'the-saved-search-id' })
      );
      expect(onClose).toHaveBeenCalled();
    });

    it('should navigate to new session when newCopyOnSave is toggled on in embedded editor', async () => {
      const services = createDiscoverServicesMock();
      const transferSpy = jest.spyOn(services.embeddableEditor, 'transferBackToEditor');
      const clearEditorStateSpy = jest.spyOn(services.embeddableEditor, 'clearEditorState');
      const navigateSpy = jest.spyOn(services.locator, 'navigate');
      const { modalProps, onClose } = await setup({
        isEmbedded: true,
        services,
      });

      await act(async () => {
        await modalProps?.onSave(
          getOnSaveProps({
            dashboardId: null,
            newCopyOnSave: true,
          })
        );
      });

      expect(transferSpy).not.toHaveBeenCalled();
      expect(clearEditorStateSpy).toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ savedSearchId: 'the-saved-search-id' })
      );
      expect(onClose).toHaveBeenCalled();
    });

    it('should navigate to new session on Save As from embedded editor without persisted session', async () => {
      const services = createDiscoverServicesMock();
      const transferSpy = jest.spyOn(services.embeddableEditor, 'transferBackToEditor');
      const clearEditorStateSpy = jest.spyOn(services.embeddableEditor, 'clearEditorState');
      const navigateSpy = jest.spyOn(services.locator, 'navigate');
      const { modalProps, onClose } = await setup({
        initialCopyOnSave: true,
        isEmbedded: true,
        persistedDiscoverSession: false,
        services,
      });

      await act(async () => {
        await modalProps?.onSave(
          getOnSaveProps({
            dashboardId: null,
            newCopyOnSave: true,
          })
        );
      });

      expect(transferSpy).not.toHaveBeenCalled();
      expect(clearEditorStateSpy).toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ savedSearchId: 'new-session' })
      );
      expect(onClose).toHaveBeenCalled();
    });

    it('should not navigate for embedded editor on regular save', async () => {
      const services = createDiscoverServicesMock();
      const navigateSpy = jest.spyOn(services.locator, 'navigate');
      const { modalProps } = await setup({ isEmbedded: true, services });

      await act(async () => {
        await modalProps?.onSave(getOnSaveProps());
      });

      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('should not navigate when updating an existing session (non-embedded)', async () => {
      const services = createDiscoverServicesMock();
      const navigateSpy = jest.spyOn(services.locator, 'navigate');
      const { modalProps } = await setup({ services });

      await act(async () => {
        await modalProps?.onSave(getOnSaveProps());
      });

      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('should navigate to new Discover session on save', async () => {
      const services = createDiscoverServicesMock();
      const navigateSpy = jest.spyOn(services.locator, 'navigate');
      const { modalProps, toolkit } = await setup({
        persistedDiscoverSession: false,
        services,
      });

      await act(async () => {
        await modalProps?.onSave(getOnSaveProps());
      });

      expect(navigateSpy).toHaveBeenCalledWith({
        savedSearchId: 'new-session',
        tab: {
          id: toolkit.getCurrentTab().id,
        },
      });
    });

    it('should navigate to dashboard when dashboardId is set', async () => {
      const services = createDiscoverServicesMock();
      const transferSpy = jest.spyOn(services.embeddableEditor, 'transferBackToEditor');
      const { modalProps } = await setup({
        initialCopyOnSave: true,
        services,
      });

      await act(async () => {
        await modalProps?.onSave(getOnSaveProps({ dashboardId: 'dashboard-123' }));
      });

      expect(transferSpy).toHaveBeenCalledWith(TransferAction.SaveByReference, {
        app: 'dashboards',
        path: '#/view/dashboard-123',
        newPanel: false,
        state: { savedObjectId: 'the-saved-search-id' },
      });
    });

    it('should navigate to new dashboard when dashboardId is "new"', async () => {
      const services = createDiscoverServicesMock();
      const transferSpy = jest.spyOn(services.embeddableEditor, 'transferBackToEditor');
      const { modalProps } = await setup({
        initialCopyOnSave: true,
        services,
      });

      await act(async () => {
        await modalProps?.onSave(getOnSaveProps({ dashboardId: 'new' }));
      });

      expect(transferSpy).toHaveBeenCalledWith(TransferAction.SaveByReference, {
        app: 'dashboards',
        path: '#/create',
        newPanel: false,
        state: { savedObjectId: 'the-saved-search-id' },
      });
    });

    it('should navigate to a dashboard when dashboardId is set for Save As', async () => {
      const services = createDiscoverServicesMock();
      const transferSpy = jest.spyOn(services.embeddableEditor, 'transferBackToEditor');
      const { modalProps } = await setup({
        initialCopyOnSave: true,
        isEmbedded: true,
        services,
      });

      await act(async () => {
        await modalProps?.onSave(
          getOnSaveProps({ dashboardId: 'dashboard-123', newCopyOnSave: true })
        );
      });

      expect(transferSpy).toHaveBeenCalledWith(TransferAction.SaveByReference, {
        app: 'dashboards',
        path: '#/view/dashboard-123',
        newPanel: true,
        state: { savedObjectId: 'the-saved-search-id' },
      });
    });

    it('should navigate to a dashboard when dashboardId is set to "new" for Save As', async () => {
      const services = createDiscoverServicesMock();
      const transferSpy = jest.spyOn(services.embeddableEditor, 'transferBackToEditor');
      const { modalProps } = await setup({
        initialCopyOnSave: true,
        isEmbedded: true,
        services,
      });

      await act(async () => {
        await modalProps?.onSave(getOnSaveProps({ dashboardId: 'new', newCopyOnSave: true }));
      });

      expect(transferSpy).toHaveBeenCalledWith(TransferAction.SaveByReference, {
        app: 'dashboards',
        path: '#/create',
        newPanel: true,
        state: { savedObjectId: 'the-saved-search-id' },
      });
    });

    it('should show a success toast on save', async () => {
      const services = createDiscoverServicesMock();
      const successSpy = jest.spyOn(services.toastNotifications, 'addSuccess');
      const { modalProps } = await setup({ isEmbedded: true, services });

      await act(async () => {
        await modalProps?.onSave(getOnSaveProps());
      });

      expect(successSpy).toHaveBeenCalledWith({
        'data-test-subj': 'saveSearchSuccess',
        title: "Discover session 'title' was saved",
      });
    });

    it('should show a danger toast on error', async () => {
      const services = createDiscoverServicesMock();
      const dangerSpy = jest.spyOn(services.toastNotifications, 'addDanger');
      const { modalProps } = await setup({
        isEmbedded: true,
        mockSaveDiscoverSession: () => Promise.reject(new Error('Save error')),
        services,
      });

      await act(async () => {
        await modalProps?.onSave(getOnSaveProps());
      });

      expect(dangerSpy).toHaveBeenCalledWith({
        text: 'Save error',
        title: "Discover session 'title' was not saved",
      });
    });

    it('should not close modal when navigating to dashboard', async () => {
      const services = createDiscoverServicesMock();
      const stateTransfer = services.embeddable.getStateTransfer();
      jest.spyOn(services.embeddable, 'getStateTransfer').mockReturnValue(stateTransfer);
      const { modalProps, onClose } = await setup({ initialCopyOnSave: true, services });

      await act(async () => {
        await modalProps?.onSave(getOnSaveProps({ dashboardId: 'dashboard-123' }));
      });

      expect(onClose).not.toHaveBeenCalled();
    });

    it('should close modal on successful save', async () => {
      const services = createDiscoverServicesMock();
      const { modalProps, onClose } = await setup({ isEmbedded: true, services });

      await act(async () => {
        await modalProps?.onSave(getOnSaveProps());
      });

      expect(onClose).toHaveBeenCalled();
    });

    it('should not close modal on error', async () => {
      const services = createDiscoverServicesMock();
      const { modalProps, onClose } = await setup({
        isEmbedded: true,
        mockSaveDiscoverSession: () => Promise.reject(new Error('Save error')),
        services,
      });

      await act(async () => {
        await modalProps?.onSave(getOnSaveProps());
      });

      expect(onClose).not.toHaveBeenCalled();
    });

    it('should show no toast when save is unsuccessful without an error', async () => {
      const services = createDiscoverServicesMock();
      const successSpy = jest.spyOn(services.toastNotifications, 'addSuccess');
      const dangerSpy = jest.spyOn(services.toastNotifications, 'addDanger');
      const { modalProps } = await setup({
        isEmbedded: true,
        mockSaveDiscoverSession: () => Promise.resolve(undefined),
        services,
      });

      await act(async () => {
        await modalProps?.onSave(getOnSaveProps());
      });

      expect(successSpy).not.toHaveBeenCalled();
      expect(dangerSpy).not.toHaveBeenCalled();
    });

    it('should call onClose when closed', async () => {
      const { modalProps, onClose } = await setup({ isEmbedded: true });

      modalProps?.onClose();

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('onSaveCb', () => {
    it('should hide dashboard options when onSaveCb is provided', async () => {
      const { modalProps } = await setup({
        onSaveCb: jest.fn(),
        persistedDiscoverSession: false,
      });

      expect(modalProps?.hideDashboardOptions).toBe(true);
    });

    it('should call onSaveCb after successful save and skip locator navigation', async () => {
      const services = createDiscoverServicesMock();
      const navigateSpy = jest.spyOn(services.locator, 'navigate');
      const onSaveCb = jest.fn();
      const { modalProps } = await setup({
        onSaveCb,
        persistedDiscoverSession: false,
        services,
      });

      await act(async () => {
        await modalProps?.onSave(getOnSaveProps());
      });

      expect(onSaveCb).toHaveBeenCalled();
      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('should show a success toast and call onSaveCb on save', async () => {
      const services = createDiscoverServicesMock();
      const successSpy = jest.spyOn(services.toastNotifications, 'addSuccess');
      const onSaveCb = jest.fn();
      const { modalProps, onClose } = await setup({
        onSaveCb,
        persistedDiscoverSession: false,
        services,
      });

      await act(async () => {
        await modalProps?.onSave(getOnSaveProps());
      });

      expect(successSpy).toHaveBeenCalled();
      expect(onSaveCb).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
