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
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { MapsEmsPluginPublicStart } from '@kbn/maps-ems-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { VEGA_EMBEDDABLE_TYPE } from '../common/constants';
import { ADD_VEGA_EMBEDDABLE_ACTION_ID, ADD_VEGA_PANEL_ACTION_ID } from './constants';
import { VegaPlugin, type VegaPluginStartDependencies } from './plugin';

const mockCreateVegaFn = jest.fn();
const mockGetVegaVisRenderer = jest.fn();

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

    return { embeddable, expressions, plugin, visualizations };
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
