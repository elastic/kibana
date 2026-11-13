/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// The public entry of the simulated `@elastic/esql-definitions` package. Kibana code imports only this file.
export {
  ARGUMENT_ROLES,
  DEFAULT_EXPRESSION_ROLE,
  DEFAULT_ROLES,
} from './signatures/argument_roles';
export {
  ENTITY_FACTS,
  ENTITY_TYPES,
  METADATA_FIELD_NAMES,
  SERVERLESS_METADATA_FIELD_NAMES,
} from './entities/entity_facts';
export type { EntityFacts, EntityItem, EntityOrigin, EntityScope } from './entities/types';
export { COMMAND_FACTS, UNDESCRIBED_COMMANDS } from './signatures/command_facts';
export { EXPRESSION_PARTS, FUNCTION_CALL } from './signatures/expression_parts';
export { FUNCTION_LAMBDAS, type FunctionLambda } from './signatures/function_lambdas';
export { getExpressionEntry, INHERITED_FIELDS, resolveRole } from './signatures/resolve_role';
export { ROLE_KINDS, validateArgumentRoles } from './signatures/validate_roles';
export type {
  ArgumentRole,
  CallSiteId,
  ColumnRole,
  CommandFacts,
  ConstantRole,
  ConstantType,
  DependentValueRole,
  EntityRole,
  EntityType,
  ExpressionMode,
  ExpressionPart,
  ExpressionRole,
  MapParameter,
  MapRole,
  NewNameRole,
  OptionFacts,
  OptionNameRole,
  ParameterRole,
  ResolvedRole,
  RoleKind,
  SublanguageRole,
  ValueFormat,
} from './signatures/types';
