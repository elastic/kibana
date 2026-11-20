/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import 'jest-canvas-mock';
import { scheme } from 'vega';
import type { DataView } from '@kbn/data-views-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import {
  isVegaSandboxOutboundMessage,
  type VegaSandboxApplyFilterMessage,
  type VegaSandboxRenderMessage,
} from '@kbn/vega-sandbox';
// The in-frame renderer is not part of the package's public entry, which must not load Vega.
import { renderVegaDescriptor } from '@kbn/vega-sandbox/src/render';
import { VegaParser } from './data_model/vega_parser';
import type { SearchAPI } from './data_model/search_api';
import type { TimeCache } from './data_model/time_cache';
import type { VegaRenderDescriptor } from './data_model/types';
import { setDataViews } from './services';
import { createVegaFilterActionHandler } from './vega_view/vega_filter_action_handler';

const ELASTIC_FIRST_COLOR = '#16C5C0';

const spec = {
  $schema: 'https://vega.github.io/schema/vega/v5.json',
  autosize: 'none',
  width: 20,
  height: 10,
  data: [
    {
      name: 'table',
      values: [
        { category: 'A', amount: 28 },
        { category: 'B', amount: 55 },
      ],
    },
  ],
  signals: [
    {
      name: 'filterOnInit',
      init: "kibanaAddFilter({match_phrase: {category: 'A'}}, 'logs-*', 'Category A')",
    },
  ],
  scales: [
    {
      name: 'color',
      type: 'ordinal',
      domain: { data: 'table', field: 'category' },
      range: 'category',
    },
  ],
  marks: [
    {
      type: 'rect',
      from: { data: 'table' },
      encode: {
        enter: {
          x: { value: 0 },
          y: { value: 0 },
          width: { value: 10 },
          height: { value: 10 },
          fill: { scale: 'color', field: 'category' },
        },
      },
    },
  ],
};

/** Maps a parent-side descriptor onto the sandbox protocol, as the sandboxed renderer will. */
const toSandboxDescriptor = (
  descriptor: VegaRenderDescriptor
): VegaSandboxRenderMessage['descriptor'] => ({
  spec: descriptor.spec,
  vlspec: descriptor.vlspec,
  colorSchemes: descriptor.colorSchemes,
  renderer: descriptor.renderer ?? 'canvas',
  useHover: Boolean(descriptor.useHover),
  useResize: Boolean(descriptor.useResize),
  tooltips: descriptor.tooltips ?? false,
  restoreSignalValuesOnRefresh: descriptor.restoreSignalValuesOnRefresh,
});

describe('Vega render path across the sandbox boundary', () => {
  const dataViews = dataViewPluginMocks.createStartContract();
  const { filterManager } = dataPluginMock.createStartContract().query;

  beforeEach(() => {
    setDataViews(dataViews);
    dataViews.find.mockResolvedValue([{ id: 'logs-id' } as DataView]);
  });

  it('renders a parsed spec in the sandbox runtime and applies its filter through the parent', async () => {
    const searchAPI = { resetSearchStats: jest.fn() } as unknown as SearchAPI;
    const parser = new VegaParser(
      JSON.stringify({ ...spec, config: { kibana: { renderer: 'svg' } } }),
      searchAPI,
      {} as TimeCache,
      {},
      async () => ({} as never),
      { darkMode: false, name: 'borealis' }
    );
    await parser.parseAsync();
    expect(parser.error).toBeUndefined();

    // The parent posts the render message; postMessage structured-clones it into the frame.
    const renderMessage: VegaSandboxRenderMessage = {
      type: 'render',
      renderId: 'render-1',
      descriptor: toSandboxDescriptor(parser.toRenderDescriptor()),
    };
    const { descriptor } = structuredClone(renderMessage);

    // A fresh frame realm has no Kibana palette; only the descriptor can supply it.
    scheme('elastic', ['#000000']);

    const onError = jest.fn();
    const onFunction = jest.fn();
    const container = document.createElement('div');
    const controller = await renderVegaDescriptor({
      container,
      controls: document.createElement('div'),
      descriptor,
      onError,
      onFunction,
    });

    expect(onError).not.toHaveBeenCalled();
    const fills = [...container.querySelectorAll('path')].map((path) => path.getAttribute('fill'));
    expect(fills).toContain(ELASTIC_FIRST_COLOR);
    expect(onFunction).toHaveBeenCalledWith({
      fn: 'kibanaAddFilter',
      args: [{ match_phrase: { category: 'A' } }, 'logs-*', 'Category A'],
    });

    // The frame posts the intent back, and the parent validates it before acting.
    const applyFilterMessage: VegaSandboxApplyFilterMessage = structuredClone({
      type: 'applyFilter',
      intent: onFunction.mock.calls[0][0],
    });
    expect(isVegaSandboxOutboundMessage(applyFilterMessage)).toBe(true);

    const fireEvent = jest.fn();
    const handle = createVegaFilterActionHandler({ spec: parser.spec, filterManager, fireEvent });
    await handle(applyFilterMessage.intent);

    expect(fireEvent).toHaveBeenCalledWith({
      name: 'applyFilter',
      data: {
        filters: [
          {
            query: { match_phrase: { category: 'A' } },
            meta: { index: 'logs-id', alias: 'Category A' },
          },
        ],
      },
    });
    controller.destroy();
  });
});
