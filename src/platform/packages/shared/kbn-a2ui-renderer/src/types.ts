/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentType } from 'react';

export const A2UI_PROTOCOL_VERSION = 'v1.0';

/** The id of the single component the spec requires at the top of every surface. */
export const ROOT_COMPONENT_ID = 'root';

export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

export interface DataBinding {
  path: string;
}

export interface FunctionCall {
  call: string;
  catalogId?: string;
  args?: Record<string, DynamicValue>;
}

export type DynamicValue = JsonValue | DataBinding | FunctionCall;

/**
 * Children are either a static id list or a template repeated over a data model
 * array. Templates are the only place relative (non-`/`-prefixed) paths resolve.
 */
export type ChildList = string[] | { componentId: string; path: string };

export interface AccessibilityAttributes {
  label?: DynamicValue;
  description?: DynamicValue;
  live?: 'off' | 'polite' | 'assertive';
  hidden?: DynamicValue;
}

export interface ComponentDefinition {
  id: string;
  component: string;
  catalogId?: string;
  accessibility?: AccessibilityAttributes;
  [prop: string]: unknown;
}

export interface ActionEvent {
  name: string;
  userMessage?: DynamicValue;
  context?: Record<string, DynamicValue>;
}

export type Action = { event: ActionEvent } | { functionCall: FunctionCall };

export interface CreateSurfaceMessage {
  version?: string;
  createSurface: {
    surfaceId: string;
    catalogId?: string;
    sendDataModel?: boolean;
    components?: ComponentDefinition[];
    dataModel?: Record<string, JsonValue>;
  };
}

export interface UpdateComponentsMessage {
  version?: string;
  updateComponents: { surfaceId: string; components: ComponentDefinition[] };
}

export interface UpdateDataModelMessage {
  version?: string;
  updateDataModel: { surfaceId: string; path?: string; value: JsonValue };
}

export interface DeleteSurfaceMessage {
  version?: string;
  deleteSurface: { surfaceId: string };
}

export type A2uiMessage =
  | CreateSurfaceMessage
  | UpdateComponentsMessage
  | UpdateDataModelMessage
  | DeleteSurfaceMessage;

/** Emitted when the user triggers an `action.event`; the host decides what it means. */
export interface ResolvedActionEvent {
  surfaceId: string;
  name: string;
  userMessage?: string;
  context: Record<string, JsonValue>;
}

export interface ComponentRenderProps<Props = Record<string, unknown>> {
  /** Component props with every dynamic value already resolved against the data model. */
  props: Props;
  id: string;
  accessibility?: { label?: string; description?: string; live?: string; hidden?: boolean };
  /** Renders a child by id, or a `ChildList` (static or templated). */
  buildChild: (child: string | ChildList | undefined) => React.ReactNode;
  /** Writes to a data model path. Input components use this for two-way binding. */
  setValue: (path: string, value: JsonValue) => void;
  /**
   * The data model path `propName` is bound to, or undefined when it holds a
   * literal. Input components pair this with `setValue` to write user input
   * back; a literal-valued input is read-only by nature.
   */
  getBindingPath: (propName: string) => string | undefined;
  /** The unresolved definition, for components that need to inspect their own schema. */
  rawProps: Record<string, unknown>;
  dispatchAction: (action: Action | undefined) => void;
}

export interface CatalogComponent<Props = Record<string, unknown>> {
  name: string;
  render: ComponentType<ComponentRenderProps<Props>>;
}

export type CatalogFunction = (args: Record<string, JsonValue>) => JsonValue;

export interface Catalog {
  id: string;
  components: Record<string, CatalogComponent<any>>;
  functions?: Record<string, CatalogFunction>;
}
