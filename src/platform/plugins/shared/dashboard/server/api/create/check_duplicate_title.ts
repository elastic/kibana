/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { DashboardSavedObjectAttributes } from '../../dashboard_saved_object';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../../common/constants';

/**
 * Checks if a dashboard with the given title already exists in the current space.
 * Mirrors the duplicate title check used by the dashboard UI (see
 * check_for_duplicate_dashboard_title.ts on the client).
 *
 * @param savedObjectsClient - The Saved Objects client (request-scoped)
 * @param title - The dashboard title to check
 * @returns true if a dashboard with this exact title already exists
 */
export async function dashboardTitleExists(
  savedObjectsClient: SavedObjectsClientContract,
  title: string
): Promise<boolean> {
  if (!title || title.trim() === '') {
    return false;
  }

  const [baseDashboardName] = extractTitleAndCount(title);

  const soResponse = await savedObjectsClient.find<DashboardSavedObjectAttributes>({
    type: DASHBOARD_SAVED_OBJECT_TYPE,
    searchFields: ['title^3', 'description'],
    fields: ['title'],
    search: baseDashboardName,
    perPage: 20,
    defaultSearchOperator: 'AND',
  });

  const duplicate = soResponse.saved_objects.some(
    (so) => (so.attributes.title ?? '').trim() === title.trim()
  );

  return duplicate;
}

/**
 * Extracts base title and optional copy number from titles like "My Dashboard (2)".
 * Kept in sync with the client-side extractTitleAndCount in public/utils.
 */
function extractTitleAndCount(title: string): [string, number] {
  if (title.slice(-1) === ')') {
    const startIndex = title.lastIndexOf(' (');
    const count = title.substring(startIndex + 2, title.lastIndexOf(')'));
    if (!count.includes('.') && Number.isInteger(Number(count)) && Number(count) >= 1) {
      const baseTitle = title.substring(0, startIndex);
      return [baseTitle, Number(count)];
    }
  }
  return [title, 0];
}
