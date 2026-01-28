/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Children } from 'react';
import type { ReactNode, ReactElement } from 'react';
import type { EuiTableActionsColumnType, DefaultItemAction } from '@elastic/eui';
import type {
  ContentListItem,
  ItemConfig,
  ActionConfig,
  ActionHandler,
} from '@kbn/content-list-provider';

/**
 * Icon type for row actions, derived from EUI's `DefaultItemAction` type.
 */
type ActionIconType = NonNullable<DefaultItemAction<ContentListItem>['icon']>;
import type { ActionsColumnConfig as ExternalActionsColumnConfig } from '../../types';
import type { ColumnBuilder, ColumnBuilderContext } from '../types';
import type { BaseColumnProps } from '../namespaces';
import { parseActionsFromChildren, isKnownAction } from './parse_actions';
import type {
  ActionDescriptor,
  KnownActionDescriptor,
  CustomActionDescriptor,
  KnownActionId,
} from './parse_actions';

/**
 * Props for Action column component.
 * Uses BaseColumnProps with component-specific children support.
 * This is the source of truth for Action column configuration.
 */
export type ActionsColumnProps = BaseColumnProps<{
  /**
   * Action components as children
   * If no children provided, all actions from provider context will be shown
   */
  children?: ReactNode;
}>;

/**
 * Internal config type used by the builder after parsing.
 */
export interface ActionsColumnConfig {
  columnTitle?: string;
  width?: string;
  parsedActions?: ActionDescriptor[] | null;
}

/**
 * Parse Actions column props from a React element.
 * This includes parsing child Action components.
 */
export const parseProps = (element: ReactElement): ActionsColumnConfig => {
  const props = element.props || {};
  const actionChildren = props.children;
  const hasActionChildren = Children.count(actionChildren) > 0;

  return {
    columnTitle: props.columnTitle,
    width: props.width,
    parsedActions: parseActionsFromChildren(actionChildren, hasActionChildren),
  };
};

/**
 * Type guard to check if config is an ActionsColumnConfig object
 */
const isActionsColumnConfig = (
  config: boolean | ExternalActionsColumnConfig | undefined
): config is ActionsColumnConfig => {
  return typeof config === 'object' && config !== null;
};

/**
 * Normalized action configuration with extracted handler and optional isEnabled.
 */
interface NormalizedActionConfig {
  handler: ActionHandler;
  isEnabled?: (item: ContentListItem) => boolean;
}

/**
 * Type guard to check if an ActionConfig is a full config object (not just a handler function).
 */
const isActionConfigObject = (
  config: ActionConfig | undefined
): config is { handler: ActionHandler; isEnabled?: (item: ContentListItem) => boolean } => {
  return typeof config === 'object' && config !== null && 'handler' in config;
};

/**
 * Normalizes an ActionConfig (shorthand or full object) into a consistent format.
 * Returns undefined if the config is not provided.
 */
const normalizeActionConfig = (
  config: ActionConfig | undefined
): NormalizedActionConfig | undefined => {
  if (!config) {
    return undefined;
  }

  if (isActionConfigObject(config)) {
    return {
      handler: config.handler,
      isEnabled: config.isEnabled,
    };
  }

  // Shorthand: just the handler function
  return {
    handler: config,
  };
};

/**
 * Primary actions that remain visible in the row actions area.
 * Per EUI Row Actions behavior, only isPrimary actions stay visible when >2 actions exist.
 * Edit and View Details are primary; all others go into the menu.
 */
const PRIMARY_ACTIONS: KnownActionId[] = ['edit', 'viewDetails'];

/**
 * Default order for known actions when no specific actions are declared.
 */
const DEFAULT_ACTION_ORDER: KnownActionId[] = [
  'edit',
  'viewDetails',
  'duplicate',
  'export',
  'delete',
];

/**
 * Metadata for known actions keyed by action ID.
 */
const KNOWN_ACTION_META: Record<
  KnownActionId,
  {
    handlerKey: 'onViewDetails' | 'onEdit' | 'onDelete' | 'onDuplicate' | 'onExport';
    iconType: ActionIconType;
    defaultName: string;
    color?: 'danger';
  }
> = {
  viewDetails: {
    handlerKey: 'onViewDetails',
    iconType: 'info',
    defaultName: 'View details',
  },
  edit: { handlerKey: 'onEdit', iconType: 'pencil', defaultName: 'Edit' },
  delete: { handlerKey: 'onDelete', iconType: 'trash', defaultName: 'Delete', color: 'danger' },
  duplicate: { handlerKey: 'onDuplicate', iconType: 'copy', defaultName: 'Duplicate' },
  export: { handlerKey: 'onExport', iconType: 'exportAction', defaultName: 'Export' },
};

/**
 * Build a DefaultItemAction from a KnownActionDescriptor.
 * Returns null if the corresponding handler is not configured.
 */
const buildKnownAction = (
  descriptor: KnownActionDescriptor,
  itemActions: NonNullable<ItemConfig['actions']>
): DefaultItemAction<ContentListItem> | null => {
  const meta = KNOWN_ACTION_META[descriptor.id];
  const actionConfig = normalizeActionConfig(itemActions[meta.handlerKey]);

  if (!actionConfig) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(`Action "${descriptor.id}" specified but no handler in provider`);
    }
    return null;
  }

  return {
    type: 'icon',
    icon: meta.iconType,
    name: descriptor.tooltip ?? meta.defaultName,
    description: descriptor['aria-label'] ?? meta.defaultName,
    color: meta.color,
    onClick: actionConfig.handler,
    enabled: actionConfig.isEnabled,
    isPrimary: PRIMARY_ACTIONS.includes(descriptor.id),
    'data-test-subj': `content-list-table-action-${descriptor.id}`,
  };
};

/**
 * Build a DefaultItemAction from a CustomActionDescriptor.
 */
const buildCustomAction = (
  descriptor: CustomActionDescriptor
): DefaultItemAction<ContentListItem> => {
  return {
    type: 'icon',
    icon: descriptor.iconType as ActionIconType,
    name: descriptor.tooltip ?? descriptor.label,
    description: descriptor['aria-label']
      ? descriptor['aria-label']
      : (item: ContentListItem) => `${descriptor.label} ${item.title}`,
    color: descriptor.color,
    onClick: descriptor.handler,
    enabled: descriptor.isEnabled,
    isPrimary: false,
    'data-test-subj': `content-list-table-action-${descriptor.id}`,
  };
};

/**
 * Build EUI DefaultItemAction array from item config and optional specified actions.
 *
 * @param itemConfig - Item configuration from the provider.
 * @param specifiedActions - Optional specific actions from declarative API.
 * @param contentEditorAction - Optional auto-wired content editor action handler.
 */
const buildEuiActions = (
  itemConfig: ItemConfig,
  specifiedActions?: ActionDescriptor[] | null,
  contentEditorAction?: (item: ContentListItem) => void
): Array<DefaultItemAction<ContentListItem>> => {
  const { actions: itemActions } = itemConfig;

  // Create effective actions by merging provider actions with auto-wired content editor.
  // If onViewDetails is not provided but contentEditorAction is, auto-wire it.
  const effectiveActions = itemActions
    ? {
        ...itemActions,
        onViewDetails:
          itemActions.onViewDetails ??
          (contentEditorAction ? { handler: contentEditorAction } : undefined),
      }
    : contentEditorAction
    ? { onViewDetails: { handler: contentEditorAction } }
    : undefined;

  if (!effectiveActions) {
    return [];
  }

  const euiActions: Array<DefaultItemAction<ContentListItem>> = [];

  // If specific actions are provided via declarative API, build only those
  if (specifiedActions) {
    for (const descriptor of specifiedActions) {
      if (isKnownAction(descriptor)) {
        const action = buildKnownAction(descriptor, effectiveActions);
        if (action) {
          euiActions.push(action);
        }
      } else {
        euiActions.push(buildCustomAction(descriptor));
      }
    }
    return euiActions;
  }

  // Default behavior: show all available known actions in defined order
  for (const actionId of DEFAULT_ACTION_ORDER) {
    const meta = KNOWN_ACTION_META[actionId];
    const actionConfig = normalizeActionConfig(effectiveActions[meta.handlerKey]);

    if (actionConfig) {
      const isPrimary = PRIMARY_ACTIONS.includes(actionId);
      euiActions.push({
        type: 'icon',
        icon: meta.iconType,
        name: meta.defaultName,
        description: isPrimary
          ? meta.defaultName
          : (item: ContentListItem) => `${meta.defaultName} ${item.title}`,
        color: meta.color,
        onClick: actionConfig.handler,
        enabled: actionConfig.isEnabled,
        isPrimary,
        'data-test-subj': `content-list-table-action-${actionId}`,
      });
    }
  }

  // Add custom actions from provider (never primary)
  if (effectiveActions.custom) {
    for (const customAction of effectiveActions.custom) {
      euiActions.push({
        type: 'icon',
        icon: customAction.iconType as ActionIconType,
        name: customAction.tooltip ?? customAction.label,
        description: (item: ContentListItem) => `${customAction.label} ${item.title}`,
        color: customAction.color,
        onClick: customAction.handler,
        enabled: customAction.isEnabled,
        isPrimary: false,
        'data-test-subj':
          customAction['data-test-subj'] ?? `content-list-table-action-${customAction.id}`,
      });
    }
  }

  return euiActions;
};

/**
 * Build the Actions column using EUI's Row Actions pattern.
 *
 * Supports auto-wiring the "View details" action from content editor when:
 * - `context.contentEditorAction` is provided
 * - `item.actions.onViewDetails` is not explicitly configured
 */
export const buildColumn: ColumnBuilder<boolean | ExternalActionsColumnConfig> = (
  config,
  context: ColumnBuilderContext
): EuiTableActionsColumnType<ContentListItem> | null => {
  // Don't render if read-only mode
  if (context.isReadOnly) {
    return null;
  }

  // Don't render if no actions configured AND no content editor action available
  if (!context.itemConfig?.actions && !context.contentEditorAction) {
    return null;
  }

  // If explicitly set to false, don't render
  if (config === false) {
    return null;
  }

  const customConfig: ActionsColumnConfig = isActionsColumnConfig(config) ? config : {};

  // Build EUI actions array from provider config and content editor action.
  const actions = buildEuiActions(
    context.itemConfig ?? {},
    customConfig.parsedActions,
    context.contentEditorAction
  );

  if (actions.length === 0) {
    return null;
  }

  return {
    name: customConfig.columnTitle ?? 'Actions',
    width: customConfig.width ?? '140px',
    actions,
  };
};
