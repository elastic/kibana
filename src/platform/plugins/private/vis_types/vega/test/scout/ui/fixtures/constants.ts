/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const VEGA_TEST_INDEX = 'vega-test-index';

/** A Vega-Lite spec with inline data, so it renders without querying Elasticsearch. */
export const VEGA_TEST_SPEC = {
  format: 'hjson',
  value: JSON.stringify({
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    data: { values: [{ a: 1 }] },
    mark: 'point',
  }),
} as const;

/** The element Vega draws into. It isn't created when the spec fails to parse. */
export const VEGA_VIEW_SELECTOR = '.vgaVis__view';

/** A data view on {@link VEGA_TEST_INDEX}. Visualize and Dashboard show the no data page without one. */
export const VEGA_TEST_DATA_VIEW_ARCHIVE =
  'src/platform/plugins/private/vis_types/vega/test/scout/ui/fixtures/kbn_archives/vega_test_data_view.json';
