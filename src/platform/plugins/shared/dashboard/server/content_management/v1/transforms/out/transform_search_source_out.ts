/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core/server';
import { injectReferences, parseSearchSourceJSON } from '@kbn/data-plugin/common';
import type { DashboardSavedObjectAttributes } from '../../../../dashboard_saved_object';
import type { DashboardState } from '../../types';
import { migrateLegacyQuery, cleanFiltersForSerialize } from '../../../../../common';
import { logger } from '../../../../kibana_services';

export function transformSearchSourceOut(
  kibanaSavedObjectMeta: DashboardSavedObjectAttributes['kibanaSavedObjectMeta'] = {},
  references: SavedObjectReference[] = []
): Pick<DashboardState, 'filters' | 'query'> {
  const { searchSourceJSON } = kibanaSavedObjectMeta;
  if (!searchSourceJSON) {
    return {};
  }
  let parsedSearchSource;
  try {
    parsedSearchSource = parseSearchSourceJSON(searchSourceJSON);
  } catch (parseError) {
    logger.warn(`Unable to parse searchSourceJSON. Error: ${parseError.message}`);
    return {};
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

  try {
    const filters = cleanFiltersForSerialize(searchSource.filter);
    const query = searchSource.query ? migrateLegacyQuery(searchSource.query) : undefined;
    return { filters, query };
  } catch (error) {
    logger.warn(
      `Unexpected error transforming filter and query state on read. Error: ${error.message}`
    );
    return {};
  }
}
