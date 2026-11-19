/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPlainObject } from 'lodash';
import { fromStoredFilters } from '@kbn/as-code-filters-transforms';
import { toAsCodeQuery } from '@kbn/as-code-shared-transforms';
import { isOfQueryType } from '@kbn/es-query';
import type { LegacyPanelMigration } from '@kbn/visualizations-plugin/server';
import type { VegaByValueState } from '../embeddable/schema';

const getStandaloneVegaSpec = (spec: string): VegaByValueState['spec'] => {
  try {
    const parsedSpec: unknown = JSON.parse(spec);
    if (isPlainObject(parsedSpec)) {
      return { format: 'json', value: parsedSpec as Record<string, unknown> };
    }
  } catch {
    // The legacy editor treated specs that do not parse as strict JSON as HJSON.
  }
  return { format: 'hjson', value: spec };
};

/** Converts a by-value legacy Vega visualization panel to a standalone `vega` panel. */
export const migrateLegacyVegaPanel = ({
  savedVis,
  panelConfig,
}: Parameters<LegacyPanelMigration['migrate']>[0]): VegaByValueState => {
  const { spec } = savedVis.params;
  if (typeof spec !== 'string') {
    throw new Error('By-value Vega visualization is missing spec');
  }

  const { query, filter } = savedVis.data.searchSource;
  const asCodeQuery = isOfQueryType(query) ? toAsCodeQuery(query) : undefined;
  const filters = fromStoredFilters(filter);

  return {
    ...panelConfig,
    title: panelConfig.title ?? savedVis.title,
    description: panelConfig.description ?? savedVis.description,
    ...(asCodeQuery?.expression && { query: asCodeQuery }),
    ...(filters?.length && { filters }),
    spec: getStandaloneVegaSpec(spec),
  };
};
