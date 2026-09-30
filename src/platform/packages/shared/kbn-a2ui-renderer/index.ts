/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { A2UI_PROTOCOL_VERSION, ROOT_COMPONENT_ID } from './src/types';
export type {
  A2uiMessage,
  AccessibilityAttributes,
  Action,
  ActionEvent,
  Catalog,
  CatalogComponent,
  CatalogFunction,
  ChildList,
  ComponentDefinition,
  ComponentRenderProps,
  CreateSurfaceMessage,
  DataBinding,
  DeleteSurfaceMessage,
  DynamicValue,
  FunctionCall,
  JsonValue,
  ResolvedActionEvent,
  UpdateComponentsMessage,
  UpdateDataModelMessage,
} from './src/types';

export { DataModel } from './src/data_model';
export { MessageProcessor } from './src/message_processor';
export type { Surface } from './src/message_processor';
export { UnknownMessageError } from './src/errors';

export { getPointer, parsePointer, setPointer, UnsafePointerError } from './src/json_pointer';

export {
  bindingPathOf,
  isDataBinding,
  isFunctionCall,
  resolveDynamic,
  resolvePath,
  resolveProps,
} from './src/resolve_dynamic';
export type { ResolveScope } from './src/resolve_dynamic';

export { A2uiSurface } from './src/surface';
export type { A2uiSurfaceProps } from './src/surface';
