/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asCodeFilterSchema, type AsCodeFilter } from '@kbn/as-code-filters-schema';
import { fromStoredFilters } from '@kbn/as-code-filters-transforms';
import type { AsCodeQuery } from '@kbn/as-code-shared-schemas';
import { toAsCodeQuery } from '@kbn/as-code-shared-transforms';
import type { SavedObjectReference } from '@kbn/core/server';
import { injectReferences, parseSearchSourceJSON } from '@kbn/data-plugin/common';

import { migrateLegacyQuery } from '../../../../common';
import type { DashboardSavedObjectAttributes } from '../../../dashboard_saved_object';
import { logger } from '../../../kibana_services';
import type { getDashboardStateSchema } from '../../dashboard_state_schemas';
import type { DashboardState, Warnings } from '../../types';

export function transformSearchSourceOut(
  kibanaSavedObjectMeta: DashboardSavedObjectAttributes['kibanaSavedObjectMeta'] = {},
  references: SavedObjectReference[] = [],
  strictValidationSchema: ReturnType<typeof getDashboardStateSchema>
): Pick<DashboardState, 'filters' | 'query'> & { warnings: Warnings } {
  const warnings: Warnings = [];

  const { searchSourceJSON } = kibanaSavedObjectMeta;
  if (!searchSourceJSON) {
    return { warnings };
  }
  let parsedSearchSource;
  try {
    parsedSearchSource = parseSearchSourceJSON(searchSourceJSON);
  } catch (parseError) {
    logger.warn(`Unable to parse searchSourceJSON. Error: ${parseError.message}`);
    return { warnings };
  }

  let searchSource;
  try {
    searchSource = injectReferences(parsedSearchSource, references);
  } catch (injectError) {
    logger.warn(
      `Unable to transform filter and query state on read. Error: ${injectError.message}`
    );
    // fallback to parsed if injection fails
    searchSource = parsedSearchSource;
  }

  let filters: AsCodeFilter[] | undefined;
  try {
    filters = fromStoredFilters(searchSource.filter, logger) ?? [];
    filters = strictValidationSchema.validateKey('filters', filters);
  } catch (error) {
    // drop all invalid filters
    const { valid, invalid } = (filters ?? []).reduce(
      (prev, filter) => {
        try {
          const result = asCodeFilterSchema.validate(filter);
          return { valid: [...prev.valid, result], invalid: prev.invalid };
        } catch (validationError) {
          return { valid: prev.valid, invalid: [...prev.invalid, filter] };
        }
      },
      {
        valid: [],
        invalid: [],
      } as { valid: AsCodeFilter[]; invalid: any[] }
    );
    filters = valid;

    const warningMessage = `Unexpected error transforming filter state on read. Error: ${error.message}`;
    logger.warn(warningMessage);
    warnings.push({
      type: 'dropped_property',
      message: warningMessage,
      key: 'filters',
      value: invalid,
    });
  }

  let query: AsCodeQuery | undefined;
  try {
    const storedQuery = searchSource.query ? migrateLegacyQuery(searchSource.query) : undefined;
    query = strictValidationSchema.validateKey('query', toAsCodeQuery(storedQuery));
  } catch (error) {
    const warningMessage = `Unexpected error transforming query state on read. Error: ${error.message}`;
    logger.warn(warningMessage);
    warnings.push({
      type: 'dropped_property',
      message: warningMessage,
      key: 'query',
      value: query,
    });
  }

  return { filters, query, warnings };
}
