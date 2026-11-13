/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The id of a place in the grammar, as the grammar package gives it: `rule.label` or
 * `rule>called`.
 */
export type CallSiteId = string;

/** The things outside the query that an argument can name. */
export type EntityType =
  | 'source'
  | 'metadata_field'
  | 'enrich_policy'
  | 'enrich_field'
  | 'lookup_index'
  | 'inference_endpoint'
  | 'setting';

/** What a string value holds, when it is more than text. */
export type ValueFormat =
  | 'llm_prompt'
  | 'search_query'
  | 'dissect_pattern'
  | 'grok_pattern'
  | 'separator'
  | 'highlight_text';

export type ConstantType =
  | 'any'
  | 'integer'
  | 'double'
  | 'string'
  | 'boolean'
  | 'date'
  | 'duration'
  /** An unquoted word, one of the role's allowed values. */
  | 'identifier';

/**
 * How an expression is read.
 *
 * - `scalar`: a value per row.
 * - `aggregation`: aggregates rows; aggregation functions apply.
 * - `grouping`: groups rows; grouping functions apply.
 * - `filter`: a condition on rows.
 * - `constant`: no column: literals, parameters and functions of them.
 * - `full_text`: a search: a string or full-text functions, never a bare column.
 */
export type ExpressionMode =
  | 'scalar'
  | 'aggregation'
  | 'grouping'
  | 'filter'
  | 'constant'
  | 'full_text';

/** An existing column. */
export interface ColumnRole {
  kind: 'column';
  /** The column types accepted; any when absent. */
  types?: readonly string[];
  /** `pattern`: wildcards are allowed in the name. `alone`: only a lone `*` is. */
  wildcard?: 'pattern' | 'alone';
  /** A column may be listed only once. */
  unique?: boolean;
  /** The column corresponds to a property of the entity another argument names. */
  matches?: { argument: CallSiteId; property: string };
}

/** A name the query introduces. Any name is valid, including an existing one. */
export interface NewNameRole {
  kind: 'new_name';
  /** `qualifier`: a short name for a lookup index, used to qualify its columns. */
  of: 'column' | 'subquery' | 'qualifier';
}

/** A named thing outside the query. */
export interface EntityRole {
  kind: 'entity';
  entityType: EntityType;
  /** For a source: only sources of this index mode. */
  indexMode?: 'time_series';
  /** For a source: a subquery may stand in its place. */
  subqueries?: boolean;
  /** The entities offered depend on the entity another argument names. */
  dependsOn?: CallSiteId;
  /** An entity may be listed only once. */
  unique?: boolean;
}

/** A literal value. */
export interface ConstantRole {
  kind: 'constant';
  valueType: ConstantType;
  allowedValues?: readonly string[];
  /** The value Elasticsearch uses when the argument is left out. */
  default?: string;
  format?: ValueFormat;
  range?: { min?: number; max?: number; exclusive?: boolean };
}

/** What using an option implies for the other options of the same list. */
export interface OptionFacts {
  /** Options that cannot be used together with this one. */
  conflictsWith?: readonly string[];
  /** Options that must be used together with this one. */
  requires?: readonly string[];
}

/** The name of an option set as `name = value`. Each option is used at most once. */
export interface OptionNameRole {
  kind: 'option_name';
  options: Readonly<Record<string, OptionFacts>>;
}

/** A parameter of a map argument. */
export interface MapParameter {
  /** The data type of the value, e.g. `keyword` or `boolean`; `map` for a nested map. */
  type: string;
  /** The value is a list of `type`. */
  list?: boolean;
  values?: readonly string[];
  /** The value Elasticsearch uses when the parameter is left out. */
  default?: string;
  /** The value names a thing outside the query. */
  entityType?: EntityType;
  /** For an inference endpoint: the task it must serve. */
  taskType?: string;
  /** The parameter applies only while the named arguments take one of the values. */
  when?: Readonly<Record<CallSiteId, readonly string[]>>;
}

/** A map of named parameters, `{ "name": value, … }`. Each parameter is used at most once. */
export interface MapRole {
  kind: 'map';
  parameters: Readonly<Record<string, MapParameter>>;
}

/** An expression. */
export interface ExpressionRole {
  kind: 'expression';
  mode: ExpressionMode;
  /** The types the expression may have; any when absent. */
  types?: readonly string[];
  /** The expression is complete only once it has this type. */
  completeAs?: 'boolean';
  /** A subquery may appear inside it. */
  subqueries?: boolean;
  /** Full-text functions are allowed only inside this function. */
  fullTextOnlyIn?: string;
  /** It also reads the columns of the entity another argument names. */
  columnsOf?: CallSiteId;
  /** What a string in its place holds. */
  format?: ValueFormat;
}

/**
 * A value whose role depends on the name another argument gives: an option's value, or the
 * value of a setting. The roles per name are listed here, or defined by the named entity.
 */
export interface DependentValueRole {
  kind: 'dependent_value';
  on: CallSiteId;
  roles?: Readonly<Record<string, ArgumentRole>>;
  definedBy?: EntityType;
}

/** A `?name` placeholder that stands for the whole argument. */
export interface ParameterRole {
  kind: 'parameter';
}

/** Text in another language, which has its own grammar. */
export interface SublanguageRole {
  kind: 'sublanguage';
  language: 'promql';
}

/**
 * What a command argument is in the language. A role says only what validation could check,
 * never how an editor presents it.
 */
export type ArgumentRole =
  | ColumnRole
  | NewNameRole
  | EntityRole
  | ConstantRole
  | OptionNameRole
  | MapRole
  | ExpressionRole
  | DependentValueRole
  | ParameterRole
  | SublanguageRole;

export type RoleKind = ArgumentRole['kind'];

/**
 * What a place inside an expression is. Expressions are the same in every command, so these
 * are described once.
 */
export type ExpressionPart =
  | { part: 'column' }
  | { part: 'literal' }
  | { part: 'function_name' }
  | { part: 'data_type' }
  | { part: 'map_key' }
  | { part: 'map_value' }
  | { part: 'match_query' }
  | { part: 'pattern' }
  /** A name the expression introduces, visible only inside `scope`. */
  | { part: 'new_name'; of: 'lambda_parameter'; scope: CallSiteId };

/** What the grammar leaves open about a command and Elasticsearch requires. */
export interface CommandFacts {
  /** The grammar makes every argument optional, and at least one is needed. */
  requiresArgument?: boolean;
  /** Repeated clauses whose alternatives may each be used only once. */
  singleUse?: readonly CallSiteId[];
}

/** The role that applies at a place, and where it comes from. */
export interface ResolvedRole {
  role: ArgumentRole;
  /** The call site that declares the role; absent for a default. */
  id?: CallSiteId;
  /** `signature`: declared for the command. `default`: what the kind of rule usually is. */
  source: 'signature' | 'default';
  /** The roles declared above it on the path, outermost first. */
  enclosing: Array<{ id: CallSiteId; role: ArgumentRole }>;
}
