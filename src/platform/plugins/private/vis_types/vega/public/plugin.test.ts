/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { inspectorPluginMock } from '@kbn/inspector-plugin/public/mocks';
import { visualizationsPluginMock } from '@kbn/visualizations-plugin/public/mocks';
import { VEGA_EMBEDDABLE_TYPE } from '../common/constants';
import { VegaPlugin } from './plugin';

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

  it.each(['legacy', 'embeddable'] as const)(
    'registers the runtime once when %s loads first',
    async (first) => {
      const { embeddable, expressions, visualizations } = setup();
      const legacyLoader = jest.mocked(visualizations.createBaseVisualizationAsync).mock
        .calls[0][1];
      const embeddableLoader = jest.mocked(embeddable.registerEmbeddablePublicDefinition).mock
        .calls[0][1];

      if (first === 'legacy') {
        await legacyLoader();
        await embeddableLoader();
      } else {
        await embeddableLoader();
        await legacyLoader();
      }

      expect(embeddable.registerEmbeddablePublicDefinition).toHaveBeenCalledWith(
        VEGA_EMBEDDABLE_TYPE,
        expect.any(Function)
      );
      expect(expressions.registerFunction).toHaveBeenCalledTimes(1);
      expect(expressions.registerRenderer).toHaveBeenCalledTimes(1);
    }
  );
});
