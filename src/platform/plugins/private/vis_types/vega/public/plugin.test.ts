/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
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
import {
  VEGA_API_ENABLED_FLAG,
  VEGA_EMBEDDABLE_TYPE,
  VEGA_SAVED_OBJECT_TYPE,
} from '../common/constants';
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

  it('registers the Vega embeddable definition', async () => {
    const { embeddable } = setup();
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

  describe('Vega library', () => {
    const startPluginWithLibraryApi = async (isLibraryApiEnabled: boolean) => {
      const setupResult = setup();
      setupResult.startCore.featureFlags.getBooleanValue$ = jest
        .fn()
        .mockImplementation(
          (flag: string) =>
            new BehaviorSubject(isLibraryApiEnabled && flag === VEGA_API_ENABLED_FLAG)
        );
      setupResult.plugin.start(setupResult.startCore, {
        data: dataPluginMock.createStartContract(),
        dataViews: dataViewPluginMocks.createStartContract(),
        embeddable: embeddablePluginMock.createStartContract(),
        expressions: expressionsPluginMock.createStartContract(),
        inspector: inspectorPluginMock.createStartContract(),
        uiActions: uiActionsPluginMock.createStartContract(),
        unifiedSearch: unifiedSearchPluginMock.createStartContract(),
        mapsEms: {} as MapsEmsPluginPublicStart,
        usageCollection: {} as UsageCollectionStart,
      });
      // The alias waits for the feature flag.
      await Promise.resolve();
      return setupResult;
    };

    beforeEach(() => {
      mockOpenVegaLibraryEditor.mockReset().mockResolvedValue(undefined);
    });

    it('lists library items next to legacy ones, but hides them from create menus', async () => {
      const { visualizations } = await startPluginWithLibraryApi(true);

      expect(visualizations.registerAlias).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'vegaLibrary',
          disableCreate: true,
          appExtensions: {
            visualizations: expect.objectContaining({ docTypes: [VEGA_SAVED_OBJECT_TYPE] }),
          },
        })
      );
    });

    it('does not list library items when the library API is disabled', async () => {
      const { visualizations } = await startPluginWithLibraryApi(false);

      expect(visualizations.registerAlias).not.toHaveBeenCalled();
    });

    it('opens the library editor for a listed item', async () => {
      const { startCore, startDeps, visualizations } = await startPluginWithLibraryApi(true);
      const { visualizations: extension } = jest.mocked(visualizations.registerAlias).mock
        .calls[0][0].appExtensions!;

      const listItem = extension.toListItem({
        id: 'item-1',
        type: VEGA_SAVED_OBJECT_TYPE,
        attributes: { title: 'My chart', description: 'A chart' },
        references: [],
      } as unknown as Parameters<typeof extension.toListItem>[0]);

      expect(listItem).toEqual(
        expect.objectContaining({
          id: 'item-1',
          title: 'My chart',
          description: 'A chart',
          savedObjectType: VEGA_SAVED_OBJECT_TYPE,
        })
      );
      await (listItem.editor as { onEdit: (id: string) => Promise<void> }).onEdit('item-1');
      expect(mockOpenVegaLibraryEditor).toHaveBeenCalledWith({
        core: startCore,
        deps: startDeps,
        id: 'item-1',
      });
    });
  });

  describe('Vega add action feature flag', () => {
    const startPlugin = (flag$: BehaviorSubject<boolean>) => {
      const core = coreMock.createStart();
      core.featureFlags.getBooleanValue$ = jest.fn().mockReturnValue(flag$);

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

      const plugin = new VegaPlugin(
        coreMock.createPluginInitializerContext({ enableExternalUrls: false })
      );
      plugin.start(core, deps);
      return { plugin, uiActions };
    };

    it('attaches the legacy Visualize-navigation action to add menus when the flag is disabled', () => {
      const { uiActions } = startPlugin(new BehaviorSubject(false));
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

    it('loads both add actions through their registered loaders', async () => {
      const { uiActions } = startPlugin(new BehaviorSubject(false));
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

    it('swaps in the standalone action and detaches the legacy action when the flag is enabled', () => {
      const { uiActions } = startPlugin(new BehaviorSubject(true));
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

    it('stops swapping actions after the plugin stops', () => {
      const flag$ = new BehaviorSubject(false);
      const { plugin, uiActions } = startPlugin(flag$);

      plugin.stop();
      flag$.next(true);

      expect(uiActions.attachAction).not.toHaveBeenCalledWith(
        ADD_PANEL_TRIGGER,
        ADD_VEGA_EMBEDDABLE_ACTION_ID
      );
    });
  });
});
