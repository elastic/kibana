/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ViewMode } from '@kbn/presentation-publishing';

import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import { coreServices, embeddableService } from '../../../services/kibana_services';
import { navigateToVisualization } from './navigation';
import type { DashboardVisualizationUserContent } from '../../types';

export async function editDashboardListingItem(
  item: UserContentCommonSchema,
  goToDashboard: (dashboardId?: string, viewMode?: ViewMode) => void
): Promise<void> {
  const { id, type } = item;

  if (type === 'dashboard') {
    goToDashboard(id, 'edit');
    return;
  }

  if (type === 'event-annotation-group') {
    // Annotation groups are handled by the annotation groups tab component
    return;
  }

  const visItem = item as DashboardVisualizationUserContent;
  const { editor } = visItem;

  if (editor) {
    if ('onEdit' in editor && editor.onEdit) {
      await editor.onEdit(id!);
      return;
    }

    if ('editUrl' in editor) {
      const { editApp, editUrl } = editor;

      // Custom app navigation (e.g., Maps)
      if (editApp && editUrl) {
        coreServices.application.navigateToApp(editApp, { path: editUrl });
        return;
      }

      if (editUrl) {
        navigateToVisualization(embeddableService.getStateTransfer(), id!, editUrl);
        return;
      }
    }
  }

  // Fallback: edit through visualize app
  navigateToVisualization(embeddableService.getStateTransfer(), id!);
}
