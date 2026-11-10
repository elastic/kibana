/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { waitFor } from '@testing-library/react';
import {
  ADD_CANVAS_ELEMENT_TRIGGER,
  ADD_PANEL_TRIGGER,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { inspectorPluginMock } from '@kbn/inspector-plugin/public/mocks';
import { visualizationsPluginMock } from '@kbn/visualizations-plugin/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { MapsEmsPluginPublicStart } from '@kbn/maps-ems-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { VEGA_AS_CODE_ENABLED_FLAG, VEGA_EMBEDDABLE_TYPE } from '../common/constants';
import { ADD_VEGA_EMBEDDABLE_ACTION_ID, ADD_VEGA_PANEL_ACTION_ID } from './constants';
import { VegaPlugin, type VegaPluginStartDependencies } from './plugin';

const mockOpenVegaLibraryEditor = jest.fn();
const mockCreateVegaFn = jest.fn();
const mockGetVegaVisRenderer = jest.fn();
const mockGetAddVegaPanelAction = jest.fn(() => ({ id: ADD_VEGA_PANEL_ACTION_ID }));
const mockGetAddVegaEmbeddableAction = jest.fn(() => ({ id: ADD_VEGA_EMBEDDABLE_ACTION_ID }));

jest.mock('./add_vega_panel_action', () => ({
  getAddVegaPanelAction: () => mockGetAddVegaPanelAction(),
}));

jest.mock('./embeddable/add_vega_embeddable_action', () => ({
  getAddVegaEmbeddableAction: () => mockGetAddVegaEmbeddableAction(),
}));

jest.mock('./library/open_vega_library_editor', () => ({
  openVegaLibraryEditor: (params: unknown) => mockOpenVegaLibraryEditor(params),
}));

const mockVegaLibraryVisTypeAlias = { name: 'vegaLibrary' };
const mockGetVegaLibraryVisTypeAlias = jest.fn(
  (_openLibraryEditor: (id: string) => Promise<void>) => mockVegaLibraryVisTypeAlias
);
jest.mock('./vega_library_vis_type_alias', () => ({
  getVegaLibraryVisTypeAlias: (openLibraryEditor: (id: string) => Promise<void>) =>
    mockGetVegaLibraryVisTypeAlias(openLibraryEditor),
}));

const mockRegisterVegaAddFromLibrary = jest.fn();
jest.mock('./embeddable/register_vega_add_from_library', () => ({
  registerVegaAddFromLibrary: (embeddable: unknown) => mockRegisterVegaAddFromLibrary(embeddable),
}));

jest.mock('./async_module', () => ({
  createVegaFn: mockCreateVegaFn,
  getVegaVisRenderer: mockGetVegaVisRenderer,
  vegaVisType: {},
}));

describe('VegaPlugin', () => {
  const setup = () => {
    const core = coreMock.createSetup();
    const startCore = coreMock.createStart();
    const startDeps = {
      expressions: { getFunction: jest.fn() },
      uiActions: { executeTriggerActions: jest.fn() },
      unifiedSearch: { ui: { SearchBar: jest.fn() } },
    };
    core.getStartServices.mockResolvedValue([startCore, startDeps, {}]);

    const embeddable = embeddablePluginMock.createSetupContract();
    const expressions = expressionsPluginMock.createSetupContract();
    const visualizations = visualizationsPluginMock.createSetupContract();
    embeddable.registerEmbeddablePublicDefinition = jest.fn();
    const plugin = new VegaPlugin(
      coreMock.createPluginInitializerContext({ enableExternalUrls: false })
    );
    plugin.setup(core, {
      embeddable,
      expressions,
      visualizations,
      inspector: inspectorPluginMock.createSetupContract(),
      data: dataPluginMock.createSetupContract(),
    });

    return { core, embeddable, expressions, plugin, startCore, startDeps, visualizations };
  };

  const startPlugin = (
    setupResult: ReturnType<typeof setup>,
    asCodeEnabled$ = new BehaviorSubject(false)
  ) => {
    const { plugin, startCore } = setupResult;
    startCore.featureFlags.getBooleanValue$.mockImplementation((flag, fallback) =>
      flag === VEGA_AS_CODE_ENABLED_FLAG ? asCodeEnabled$ : new BehaviorSubject(fallback)
    );
    const uiActions = uiActionsPluginMock.createStartContract();
    const deps: VegaPluginStartDependencies = {
      data: dataPluginMock.createStartContract(),
      dataViews: dataViewPluginMocks.createStartContract(),
      embeddable: embeddablePluginMock.createStartContract(),
      expressions: expressionsPluginMock.createStartContract(),
      inspector: inspectorPluginMock.createStartContract(),
      uiActions,
      unifiedSearch: unifiedSearchPluginMock.createStartContract(),
      // No public start mocks exist for these; the plugin only stores them at start.
      mapsEms: {} as MapsEmsPluginPublicStart,
      usageCollection: {} as UsageCollectionStart,
    };
    plugin.start(startCore, deps);
    return { ...setupResult, uiActions };
  };

  beforeEach(() => {
    mockOpenVegaLibraryEditor.mockReset().mockResolvedValue(undefined);
    mockGetVegaLibraryVisTypeAlias.mockClear();
    mockRegisterVegaAddFromLibrary.mockClear();
  });

  it('registers the Vega embeddable definition', async () => {
    const { embeddable } = startPlugin(setup());
    const embeddableLoader = jest.mocked(embeddable.registerEmbeddablePublicDefinition).mock
      .calls[0][1];

    await embeddableLoader();

    expect(embeddable.registerEmbeddablePublicDefinition).toHaveBeenCalledWith(
      VEGA_EMBEDDABLE_TYPE,
      expect.any(Function)
    );
  });

  it('registers the expression runtime once for the legacy visualization', async () => {
    const { expressions, visualizations } = setup();
    const legacyLoader = jest.mocked(visualizations.createBaseVisualizationAsync).mock.calls[0][1];

    await legacyLoader();

    expect(expressions.registerFunction).toHaveBeenCalledTimes(1);
    expect(expressions.registerRenderer).toHaveBeenCalledTimes(1);
  });

  it('loads both add actions through their registered loaders', async () => {
    const { uiActions } = startPlugin(setup());
    const legacyLoader = uiActions.registerActionAsync.mock.calls.find(
      ([actionId]) => actionId === ADD_VEGA_PANEL_ACTION_ID
    )?.[1];
    const embeddableLoader = uiActions.registerActionAsync.mock.calls.find(
      ([actionId]) => actionId === ADD_VEGA_EMBEDDABLE_ACTION_ID
    )?.[1];
    if (!legacyLoader || !embeddableLoader) throw new Error('Expected add action loaders');

    expect((await legacyLoader()).id).toBe(ADD_VEGA_PANEL_ACTION_ID);
    expect((await embeddableLoader()).id).toBe(ADD_VEGA_EMBEDDABLE_ACTION_ID);
  });

  describe('vega.asCodeEnabled feature flag', () => {
    it('lists and offers library items when the flag is enabled', async () => {
      const { embeddable, visualizations } = startPlugin(setup(), new BehaviorSubject(true));

      await waitFor(() =>
        expect(visualizations.registerAlias).toHaveBeenCalledWith(mockVegaLibraryVisTypeAlias)
      );
      expect(mockRegisterVegaAddFromLibrary).toHaveBeenCalledWith(embeddable);
    });

    it('neither lists nor offers library items when the flag is disabled', async () => {
      const { visualizations } = startPlugin(setup());
      await new Promise((resolve) => setImmediate(resolve));

      expect(visualizations.registerAlias).not.toHaveBeenCalled();
      expect(mockRegisterVegaAddFromLibrary).not.toHaveBeenCalled();
    });

    it('registers library items only once when the flag toggles', async () => {
      const asCodeEnabled$ = new BehaviorSubject(true);
      const { visualizations } = startPlugin(setup(), asCodeEnabled$);

      asCodeEnabled$.next(false);
      asCodeEnabled$.next(true);

      await waitFor(() => expect(visualizations.registerAlias).toHaveBeenCalledTimes(1));
      expect(mockRegisterVegaAddFromLibrary).toHaveBeenCalledTimes(1);
    });

    it('opens the library editor with the start services', async () => {
      const { startCore, startDeps } = startPlugin(setup(), new BehaviorSubject(true));
      await waitFor(() => expect(mockGetVegaLibraryVisTypeAlias).toHaveBeenCalled());
      const [openLibraryEditor] = mockGetVegaLibraryVisTypeAlias.mock.calls[0];

      await openLibraryEditor('item-1');

      expect(mockOpenVegaLibraryEditor).toHaveBeenCalledWith({
        core: startCore,
        deps: startDeps,
        id: 'item-1',
      });
    });

    it('attaches the legacy Visualize-navigation action to add menus when the flag is disabled', () => {
      const { uiActions } = startPlugin(setup());
      // Legacy action swapped onto the Dashboard Add-panel menu; the standalone action is not.
      expect(uiActions.attachAction).toHaveBeenCalledWith(
        ADD_PANEL_TRIGGER,
        ADD_VEGA_PANEL_ACTION_ID
      );
      expect(uiActions.attachAction).not.toHaveBeenCalledWith(
        ADD_PANEL_TRIGGER,
        ADD_VEGA_EMBEDDABLE_ACTION_ID
      );
      // Canvas also gets the legacy action while the flag is disabled.
      expect(uiActions.attachAction).toHaveBeenCalledWith(
        ADD_CANVAS_ELEMENT_TRIGGER,
        ADD_VEGA_PANEL_ACTION_ID
      );
    });

    it('swaps in the standalone action and detaches the legacy action when the flag is enabled', () => {
      const { uiActions } = startPlugin(setup(), new BehaviorSubject(true));
      expect(uiActions.attachAction).toHaveBeenCalledWith(
        ADD_PANEL_TRIGGER,
        ADD_VEGA_EMBEDDABLE_ACTION_ID
      );
      expect(uiActions.detachAction).toHaveBeenCalledWith(
        ADD_PANEL_TRIGGER,
        ADD_VEGA_PANEL_ACTION_ID
      );
      expect(uiActions.attachAction).toHaveBeenCalledWith(
        ADD_CANVAS_ELEMENT_TRIGGER,
        ADD_VEGA_EMBEDDABLE_ACTION_ID
      );
      expect(uiActions.detachAction).toHaveBeenCalledWith(
        ADD_CANVAS_ELEMENT_TRIGGER,
        ADD_VEGA_PANEL_ACTION_ID
      );
    });

    it('stops responding to the flag after the plugin stops', async () => {
      const asCodeEnabled$ = new BehaviorSubject(false);
      const { plugin, uiActions, visualizations } = startPlugin(setup(), asCodeEnabled$);

      plugin.stop();
      asCodeEnabled$.next(true);
      await new Promise((resolve) => setImmediate(resolve));

      expect(uiActions.attachAction).not.toHaveBeenCalledWith(
        ADD_PANEL_TRIGGER,
        ADD_VEGA_EMBEDDABLE_ACTION_ID
      );
      expect(visualizations.registerAlias).not.toHaveBeenCalled();
    });
  });
});
