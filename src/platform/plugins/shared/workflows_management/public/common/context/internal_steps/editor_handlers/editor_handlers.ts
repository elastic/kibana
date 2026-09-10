/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EditorHandlers } from '@kbn/workflows/types/latest';
import { getIndexSelectionHandler } from '@kbn/workflows-ui';
import type { WorkflowsServices } from '../../../../types';

export class InternalStepsEditorHandlers {
  private stepsWithEditorHandlers: Map<string, EditorHandlers>;

  constructor(services: WorkflowsServices) {
    this.stepsWithEditorHandlers = new Map(
      Object.entries(this.createStepsEditorHandlers(services))
    );
  }

  public hasEditorHandlers(stepType: string) {
    return this.stepsWithEditorHandlers.has(stepType);
  }

  public getEditorHandlers(stepType: string) {
    return this.stepsWithEditorHandlers.get(stepType);
  }

  private createStepsEditorHandlers = (
    services: WorkflowsServices
  ): Record<string, EditorHandlers> => {
    const searchIndexSelectionHandler = getIndexSelectionHandler(services, {
      allowWildcard: true,
      showAllIndices: true,
    });
    const writeIndexSelectionHandler = getIndexSelectionHandler(services, {
      allowWildcard: false,
      showAllIndices: true,
    });
    const deleteIndexSelectionHandler = getIndexSelectionHandler(services, {
      allowWildcard: false,
      showAllIndices: false,
    });

    return {
      'elasticsearch.search': {
        input: { index: { selection: searchIndexSelectionHandler } },
      },
      'elasticsearch.update': {
        input: { index: { selection: writeIndexSelectionHandler } },
      },
      'elasticsearch.index': {
        input: { index: { selection: writeIndexSelectionHandler } },
      },
      'elasticsearch.indices.delete': {
        input: { index: { selection: deleteIndexSelectionHandler } },
      },
    };
  };
}
