/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type {
  VisualizationListItem,
  VisualizationStage,
} from '../vis_types/vis_type_alias_registry';

export type VisualizeUserContent = VisualizationListItem &
  UserContentCommonSchema & {
    type: string;
    attributes: {
      id: string;
      title: string;
      description?: string;
      readOnly: boolean;
      error?: string;
    };
  };

export const toTableListViewSavedObject = (
  savedObject: Record<string, unknown>
): VisualizeUserContent => {
  return {
    id: savedObject.id as string,
    updatedAt: savedObject.updatedAt as string,
    managed: savedObject.managed as boolean,
    references: savedObject.references as Array<{ id: string; type: string; name: string }>,
    type: savedObject.savedObjectType as string,
    icon: savedObject.icon as string,
    stage: savedObject.stage as VisualizationStage,
    savedObjectType: savedObject.savedObjectType as string,
    typeTitle: savedObject.typeTitle as string,
    title: (savedObject.title as string) ?? '',
    error: (savedObject.error as string) ?? '',
    editor: savedObject.editor as any,
    attributes: {
      id: savedObject.id as string,
      title: (savedObject.title as string) ?? '',
      description: savedObject.description as string,
      readOnly: savedObject.readOnly as boolean,
      error: savedObject.error as string,
    },
  };
};
