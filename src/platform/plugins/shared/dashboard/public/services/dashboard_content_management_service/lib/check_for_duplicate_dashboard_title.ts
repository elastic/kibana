/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardSearchIn, DashboardSearchOut } from '../../../../server/content_management';
import { DASHBOARD_CONTENT_ID } from '../../../utils/telemetry_constants';
import { extractTitleAndCount } from '../../../utils/extract_title_and_count';
import { contentManagementService, coreServices } from '../../kibana_services';

export interface DashboardDuplicateTitleCheckProps {
  title: string;
  copyOnSave: boolean;
  lastSavedTitle: string;
  onTitleDuplicate?: (speculativeSuggestion: string) => void;
  isTitleDuplicateConfirmed: boolean;
}

export async function checkForDuplicateDashboardTitle({
  title,
  copyOnSave,
  lastSavedTitle,
  onTitleDuplicate,
  isTitleDuplicateConfirmed,
}: DashboardDuplicateTitleCheckProps): Promise<boolean> {
  // Don't check if the title is an empty string
  if (!title) {
    return true;
  }

  // Don't check for duplicates if user has already confirmed save with duplicate title
  if (isTitleDuplicateConfirmed) {
    return true;
  }

  // Don't check if the user isn't updating the title, otherwise that would become very annoying to have
  // to confirm the save every time, except when copyOnSave is true, then we do want to check.
  if (title === lastSavedTitle && !copyOnSave) {
    return true;
  }

  const [baseDashboardName] = extractTitleAndCount(title);

  const queryParams = new URLSearchParams({
    perPage: '20',
    search: `${baseDashboardName}*`,
  });

  const response = await coreServices.http.get(`/api/dashboards/dashboard?${queryParams.toString()}`) as DashboardSearchResponse;

  const duplicate = Boolean(
    response.items.find((item) => item.data.title.toLowerCase() === title.toLowerCase())
  );

  if (!duplicate) {
    return true;
  }

  const [largestDuplicationId] = response.items
    .map((item) => extractTitleAndCount(item.data.title)[1])
    .sort((a, b) => b - a);

  const speculativeCollisionFreeTitle = `${baseDashboardName} (${largestDuplicationId + 1})`;

  onTitleDuplicate?.(speculativeCollisionFreeTitle);

  return false;
}
