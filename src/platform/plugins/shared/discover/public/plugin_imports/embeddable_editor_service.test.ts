/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import type { SavedSearchByValueAttributes } from '@kbn/saved-search-plugin/common';
import { coreMock } from '@kbn/core/public/mocks';
import { ESQL_CONTROL } from '@kbn/controls-constants';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import type { ControlPanelsState } from '@kbn/control-group-renderer';
import type { EmbeddableEditorState, EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { EmbeddableEditorService, TransferAction } from './embeddable_editor_service';
import { mockControlState } from '../__mocks__/esql_controls';

describe('EmbeddableEditorService', () => {
  const createApplication = ({
    show = true,
    createNew = true,
  }: {
    show?: boolean;
    createNew?: boolean;
  } = {}) => {
    const application = coreMock.createStart().application;

    return {
      ...application,
      capabilities: {
        ...application.capabilities,
        dashboard_v2: {
          ...application.capabilities.dashboard_v2,
          show,
          createNew,
        },
      },
    };
  };

  const createStateTransfer = (incomingState?: EmbeddableEditorState): EmbeddableStateTransfer => {
    const embeddableStateTransfer = embeddablePluginMock.createStartContract().getStateTransfer();

    jest.mocked(embeddableStateTransfer.getIncomingEditorState).mockReturnValue(incomingState);

    return embeddableStateTransfer;
  };

  const createService = ({
    incomingState,
    application = createApplication(),
  }: {
    incomingState?: EmbeddableEditorState;
    application?: ReturnType<typeof createApplication>;
  } = {}) => {
    const embeddableStateTransfer = createStateTransfer(incomingState);
    const service = new EmbeddableEditorService(embeddableStateTransfer, application);

    return { service, embeddableStateTransfer };
  };

  const createIncomingState = (
    overrides: Partial<EmbeddableEditorState> = {}
  ): EmbeddableEditorState => ({
    originatingApp: 'dashboard',
    ...overrides,
  });

  const createByValueState = (
    overrides: Partial<SavedSearchByValueAttributes> = {}
  ): SavedSearchByValueAttributes => ({
    title: 'Saved search',
    sort: [],
    columns: [],
    description: '',
    grid: {},
    hideChart: false,
    hideTable: false,
    isTextBasedQuery: false,
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{}',
    },
    tabs: [],
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows saving to dashboard only when not embedded and dashboard capabilities are enabled', () => {
    const standaloneService = createService().service;
    const embeddedService = createService({
      incomingState: createIncomingState({
        originatingPath: '/app/dashboards',
      }),
    }).service;
    const noShowCapabilityService = createService({
      application: createApplication({ show: false }),
    }).service;
    const noCreateCapabilityService = createService({
      application: createApplication({ createNew: false }),
    }).service;

    expect(standaloneService.canSaveToDashboard()).toBe(true);
    expect(embeddedService.canSaveToDashboard()).toBe(false);
    expect(noShowCapabilityService.canSaveToDashboard()).toBe(false);
    expect(noCreateCapabilityService.canSaveToDashboard()).toBe(false);
  });

  it('exposes the incoming by-value editor state and clears it once', () => {
    const byValueTab = { id: 'tab-1' };
    const incomingState = createIncomingState({
      originatingPath: '/app/dashboards',
      embeddableId: 'panel-1',
      valueInput: {
        discoverSessionTab: byValueTab,
        dashboardControlGroupState: undefined,
      },
    });
    const { service, embeddableStateTransfer } = createService({ incomingState });

    expect(service.isEmbeddedEditor()).toBe(true);
    expect(service.isByValueEditor()).toBe(true);
    expect(service.getByValueTab()).toBe(byValueTab);

    service.clearEditorState();
    service.clearEditorState();

    expect(embeddableStateTransfer.clearEditorState).toHaveBeenCalledTimes(1);
    expect(embeddableStateTransfer.clearEditorState).toHaveBeenCalledWith('discover');
    expect(service.isEmbeddedEditor()).toBe(false);
  });

  it('navigates back with no serialized state for cancel', () => {
    const incomingState = createIncomingState({
      originatingPath: '/app/dashboards#/edit',
      embeddableId: 'panel-1',
    });
    const { service, embeddableStateTransfer } = createService({ incomingState });

    service.transferBackToEditor(TransferAction.Cancel);

    expect(embeddableStateTransfer.clearEditorState).toHaveBeenCalledWith('discover');
    expect(embeddableStateTransfer.navigateToWithEmbeddablePackages).toHaveBeenCalledWith(
      'dashboard',
      {
        path: '/app/dashboards#/edit',
        state: [],
      }
    );
  });

  it('preserves the embeddable id when saving the session without serialized state', () => {
    const incomingState = createIncomingState({
      originatingPath: '/app/dashboards#/edit',
      embeddableId: 'panel-1',
    });
    const { service, embeddableStateTransfer } = createService({ incomingState });

    service.transferBackToEditor(TransferAction.SaveSession);

    expect(embeddableStateTransfer.clearEditorState).toHaveBeenCalledWith('discover');
    expect(embeddableStateTransfer.navigateToWithEmbeddablePackages).toHaveBeenCalledWith(
      'dashboard',
      {
        path: '/app/dashboards#/edit',
        state: [
          {
            type: SEARCH_EMBEDDABLE_TYPE,
            serializedState: {},
            embeddableId: 'panel-1',
          },
        ],
      }
    );
  });

  it('serializes by-value state and control packages when navigating back to the editor', () => {
    const byValueState = createByValueState();
    const controlGroupState: ControlPanelsState<OptionsListESQLControlState> = {
      controlA: {
        ...mockControlState.panel1,
        variable_name: 'host.name',
        title: 'Host name',
      },
      controlB: {
        ...mockControlState.panel1,
        variable_name: 'service.name',
        title: 'Service name',
        order: 1,
      },
    };
    const incomingState = createIncomingState({
      originatingPath: '/app/dashboards#/edit',
      embeddableId: 'panel-42',
    });
    const { service, embeddableStateTransfer } = createService({ incomingState });

    service.transferBackToEditor(TransferAction.SaveByValue, {
      state: {
        byValueState,
        controlGroupState,
      },
    });

    expect(embeddableStateTransfer.navigateToWithEmbeddablePackages).toHaveBeenCalledWith(
      'dashboard',
      {
        path: '/app/dashboards#/edit',
        state: [
          {
            type: ESQL_CONTROL,
            serializedState: controlGroupState.controlA,
            embeddableId: 'controlA',
          },
          {
            type: ESQL_CONTROL,
            serializedState: controlGroupState.controlB,
            embeddableId: 'controlB',
          },
          {
            type: SEARCH_EMBEDDABLE_TYPE,
            serializedState: {
              attributes: byValueState,
            },
            embeddableId: 'panel-42',
          },
        ],
      }
    );
  });

  it('reuses dashboard panel ids for SaveByValue controls with duplicate variables', () => {
    const byValueState = createByValueState();
    const controlGroupState: ControlPanelsState<OptionsListESQLControlState> = {
      discoverControlA: {
        ...mockControlState.panel1,
        variable_name: 'host.name',
        title: 'Updated host name',
      },
      discoverControlB: {
        ...mockControlState.panel1,
        variable_name: 'service.name',
        title: 'Updated service name',
      },
      discoverControlC: {
        ...mockControlState.panel1,
        variable_name: 'cloud.region',
        title: 'Cloud region',
      },
    };
    const dashboardControlGroupState: ControlPanelsState<OptionsListESQLControlState> = {
      dashboardHostPanel: {
        ...mockControlState.panel1,
        variable_name: 'host.name',
        title: 'Original host name',
      },
      dashboardServicePanel: {
        ...mockControlState.panel1,
        variable_name: 'service.name',
        title: 'Original service name',
      },
      dashboardOtherPanel: {
        ...mockControlState.panel1,
        variable_name: 'event.dataset',
        title: 'Original event dataset',
      },
    };
    const incomingState = createIncomingState({
      originatingPath: '/app/dashboards#/edit',
      embeddableId: 'panel-42',
      valueInput: {
        discoverSessionTab: { id: 'tab-1' },
        dashboardControlGroupState,
      },
    });
    const { service, embeddableStateTransfer } = createService({ incomingState });

    service.transferBackToEditor(TransferAction.SaveByValue, {
      state: {
        byValueState,
        controlGroupState,
      },
    });

    expect(embeddableStateTransfer.navigateToWithEmbeddablePackages).toHaveBeenCalledWith(
      'dashboard',
      {
        path: '/app/dashboards#/edit',
        state: [
          {
            type: ESQL_CONTROL,
            serializedState: controlGroupState.discoverControlA,
            embeddableId: 'dashboardHostPanel',
          },
          {
            type: ESQL_CONTROL,
            serializedState: controlGroupState.discoverControlB,
            embeddableId: 'dashboardServicePanel',
          },
          {
            type: ESQL_CONTROL,
            serializedState: controlGroupState.discoverControlC,
            embeddableId: 'discoverControlC',
          },
          {
            type: SEARCH_EMBEDDABLE_TYPE,
            serializedState: {
              attributes: byValueState,
            },
            embeddableId: 'panel-42',
          },
        ],
      }
    );
  });

  it('serializes by-reference state and supports explicit app and path overrides', () => {
    const { service, embeddableStateTransfer } = createService();

    service.transferBackToEditor(TransferAction.SaveByReference, {
      app: 'dashboard',
      path: '/app/dashboards#/create',
      state: {
        savedObjectId: 'saved-search-1',
      },
    });

    expect(embeddableStateTransfer.clearEditorState).toHaveBeenCalledWith('discover');
    expect(embeddableStateTransfer.navigateToWithEmbeddablePackages).toHaveBeenCalledWith(
      'dashboard',
      {
        path: '/app/dashboards#/create',
        state: [
          {
            type: SEARCH_EMBEDDABLE_TYPE,
            serializedState: {
              ref_id: 'saved-search-1',
              overrides: {},
            },
            embeddableId: undefined,
          },
        ],
      }
    );
  });

  it('does not navigate when there is no editor origin and no explicit destination', () => {
    const { service, embeddableStateTransfer } = createService();

    service.transferBackToEditor(TransferAction.Cancel);

    expect(embeddableStateTransfer.clearEditorState).not.toHaveBeenCalled();
    expect(embeddableStateTransfer.navigateToWithEmbeddablePackages).not.toHaveBeenCalled();
  });
});
