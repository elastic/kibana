/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type { DefaultItemAction, EuiButtonIconProps } from '@elastic/eui';
import type { ContentListItem } from '@kbn/content-list-provider';
import type { BuilderContext } from '../column/types';

/**
 * Output type for resolved action presets.
 *
 * Each action preset resolves to an EUI `DefaultItemAction` suitable for
 * use in an `EuiTableActionsColumnType.actions` array.
 */
export type ActionOutput = DefaultItemAction<ContentListItem>;

/**
 * Context passed to action builder functions.
 *
 * Extends {@link BuilderContext} with action-specific fields. Today it is
 * identical to the base; the Delete Orchestration PR will add
 * `onRequestDelete` and related callbacks here.
 */
export type ActionBuilderContext = BuilderContext;

/**
 * Props for the `Action` component (custom actions).
 *
 * Custom actions are identified by `props.id` and provide their own
 * behavior. Pre-built actions (like `Action.Edit`) have dedicated
 * preset components with their own props interfaces.
 */
export interface ActionProps {
  /** Unique identifier for the action. */
  id: string;
  /** Display name for the action (shown in menu and tooltip). */
  name: string | ((item: ContentListItem) => ReactNode);
  /** Accessible description for the action. */
  description?: string;
  /** Icon type (EUI icon name). */
  icon?: string;
  /** Render type: `'icon'` (compact) or `'button'` (full). */
  type?: 'icon' | 'button';
  /** Icon/button color (matches EUI button color palette). */
  color?: EuiButtonIconProps['color'];
  /** Click handler. */
  onClick?: (item: ContentListItem) => void;
  /** Link href (string or function returning href per item). */
  href?: string | ((item: ContentListItem) => string);
  /** Whether the action is enabled for a given item. */
  enabled?: (item: ContentListItem) => boolean;
  /** Whether the action is available (visible) for a given item. */
  available?: (item: ContentListItem) => boolean;
  /** Test subject for testing. */
  'data-test-subj'?: string;
}

/**
 * Namespace interface for `Action` sub-components.
 *
 * The base `Action` accepts {@link ActionProps}; pre-built actions
 * are properties (e.g., `Action.Edit`, `Action.Delete`).
 */
export interface ActionNamespace {
  (props: ActionProps): ReactNode;
  Edit: (props: EditActionProps) => ReactNode;
  Delete: (props: DeleteActionProps) => ReactNode;
}

/**
 * Props for the `Action.Edit` preset component.
 */
export interface EditActionProps {
  /** Custom label for the edit action. Defaults to `'Edit'`. */
  label?: string;
}

/**
 * Props for the `Action.Delete` preset component.
 */
export interface DeleteActionProps {
  /** Custom label for the delete action. Defaults to `'Delete'`. */
  label?: string;
}
