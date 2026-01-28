/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { useContentListConfig, useContentListSelection } from '@kbn/content-list-provider';
import type { KnownActionId, ActionBuilderContext } from './types';
import { buildDeleteAction, type DeleteActionConfig } from './delete';
import { buildExportAction, type ExportActionConfig } from './export';
import {
  buildAction as buildSelectionAction,
  type SelectionActionConfig,
} from './selection_action_builder';

/**
 * Union type for all action configurations.
 */
export type ActionConfig = DeleteActionConfig | ExportActionConfig | SelectionActionConfig;

/**
 * Action descriptor - pairs an action ID with its configuration.
 */
export interface ActionDescriptor {
  /** The action identifier ('delete', 'export', or custom id). */
  id: string;
  /** The parsed action configuration. */
  config: ActionConfig;
}

/**
 * Map of known action IDs to their builder functions.
 */
const builders: Record<
  KnownActionId,
  (config: ActionConfig, context: ActionBuilderContext) => React.ReactElement | null
> = {
  delete: (config, context) => buildDeleteAction(config as DeleteActionConfig, context),
  export: (config, context) => buildExportAction(config as ExportActionConfig, context),
};

/**
 * Build action elements from action descriptors.
 *
 * @param actions - Array of action descriptors.
 * @param context - The action builder context.
 * @returns Array of React elements for the action buttons.
 */
export const buildActionsFromConfig = (
  actions: ActionDescriptor[],
  context: ActionBuilderContext
): React.ReactElement[] => {
  const elements: React.ReactElement[] = [];

  for (const { id, config } of actions) {
    if (id in builders) {
      // Known action - use the registered builder.
      const element = builders[id as KnownActionId](config, context);
      if (element) {
        elements.push(element);
      }
    } else {
      // Custom action - use the selection action builder.
      const element = buildSelectionAction(config as SelectionActionConfig, context);
      if (element) {
        elements.push(element);
      }
    }
  }

  return elements;
};

/**
 * Props for the {@link SelectionActionsRenderer} component.
 */
export interface SelectionActionsRendererProps {
  /** Array of {@link ActionDescriptor} objects defining the available actions. */
  actions: ActionDescriptor[];
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

/**
 * `SelectionActionsRenderer` component.
 *
 * Renders the action buttons based on an array of {@link ActionDescriptor} objects.
 * Delegates to specific builders for each action type:
 * - {@link buildDeleteAction} for delete actions.
 * - {@link buildExportAction} for export actions.
 * - {@link buildSelectionAction} for custom actions.
 *
 * Only shows when items are selected and actions are available.
 *
 * @param props - The component props. See {@link SelectionActionsRendererProps}.
 * @returns A React element containing the action buttons, or `null` if not applicable.
 */
export const SelectionActionsRenderer = ({
  actions,
  'data-test-subj': dataTestSubj = 'contentListSelectionActions',
}: SelectionActionsRendererProps) => {
  const config = useContentListConfig();
  const { selectedCount, getSelectedItems, clearSelection } = useContentListSelection();

  // Return null if in read-only mode or no selection configured.
  if (config.isReadOnly || !config.features.selection) {
    return null;
  }

  // Only show when items are selected.
  if (selectedCount === 0) {
    return null;
  }

  // Return null if no actions.
  if (actions.length === 0) {
    return null;
  }

  const { onSelectionDelete, onSelectionExport } = config.features.selection;

  // Build the action context.
  const context: ActionBuilderContext = {
    selectedCount,
    getSelectedItems,
    clearSelection,
    onSelectionDelete,
    onSelectionExport,
    entityName: config.entityName,
    entityNamePlural: config.entityNamePlural,
  };

  // Build action elements.
  const actionElements = buildActionsFromConfig(actions, context);

  if (actionElements.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" data-test-subj={dataTestSubj}>
      {actionElements}
    </EuiFlexGroup>
  );
};
