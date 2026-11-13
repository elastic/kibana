/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildMapKeySuggestion,
  buildMapValueCompleteItem,
  type MapValueType,
} from '../../../commands/registry/complete_items';
import { withAutoSuggest } from '../../../commands/definitions/utils/autocomplete/helpers';
import type { ISuggestionItem } from '../../../commands/registry/types';
import {
  ARGUMENT_ROLES,
  EXPRESSION_PARTS,
  resolveRole,
  type ArgumentRole,
  type DependentValueRole,
  type MapParameter,
  type MapRole,
  type OptionNameRole,
  type ResolvedRole,
} from '../../../esql_js_sim/definitions';
import type { ExpectedArgument, WrittenArgument } from '../../../esql_js_sim/grammar';
import { SuggestionCategory } from '../../autocomplete/utils/sorting/types';
import { ENTITIES } from '../entities/registry';
import type { SuggestionContext } from '../types';

const STRING_TYPES: readonly string[] = ['keyword', 'text', 'string'];
const NUMBER_TYPES: readonly string[] = ['integer', 'long', 'double', 'number'];

const unquoted = (text: string): string => text.replace(/^["`]|["`]$/g, '');

const partOf = (id: string): string | undefined => EXPRESSION_PARTS[id]?.part;

const pathOf = ({ ancestors, id }: WrittenArgument): string[] => [
  ...ancestors.map((ancestor) => ancestor.id),
  id,
];

/** The text of the last written argument a call site took, without its quotes. */
const writtenAt = ({ ir }: SuggestionContext, id: string): string | undefined => {
  const written = ir.written.findLast((argument) => argument.id === id && !argument.open);

  return written && unquoted(written.text);
};

/**
 * How deep in maps a place is. A map inside a map repeats the call sites of a map entry in
 * the path, once per level, so the depth is how often the most repeated call site occurs.
 */
const mapDepth = (path: string[]): number =>
  Math.max(0, ...path.map((id) => path.filter((other) => other === id).length));

/** Whether a parameter applies, given the values the arguments it depends on have. */
const applies = ({ when = {} }: MapParameter, context: SuggestionContext): boolean =>
  Object.entries(when).every(([id, values]) => {
    const role = ARGUMENT_ROLES[id];
    const value = writtenAt(context, id) ?? (role?.kind === 'constant' ? role.default : undefined);

    return value !== undefined && values.includes(value.toLowerCase());
  });

const keyType = ({ type, list }: MapParameter): MapValueType => {
  if (list) {
    return 'array';
  }
  if (type === 'map') {
    return 'map';
  }
  if (type === 'boolean') {
    return 'boolean';
  }

  return NUMBER_TYPES.includes(type) ? 'number' : 'string';
};

/** The values a parameter can take: the ones it lists, the entities it names, or its default. */
const valuesOf = async (
  { values, entityType, taskType, default: defaultValue }: MapParameter,
  { callbacks }: SuggestionContext
): Promise<string[]> => {
  if (values) {
    return [...values];
  }
  if (entityType) {
    const entities = await ENTITIES[entityType].fetch(callbacks ?? {}, {
      taskType,
      inSubquery: false,
      isServerless: callbacks?.isServerless ?? false,
    });

    return entities.filter(({ hidden }) => !hidden).map(({ name }) => name);
  }

  return defaultValue === undefined ? [] : [defaultValue];
};

/**
 * The keys of a map that are not used yet, or the values of the key before the cursor. The
 * parameters of a role describe the map itself, so nothing is offered inside a nested map.
 */
export const provideMap = async (
  { parameters }: MapRole,
  argument: ExpectedArgument,
  context: SuggestionContext
): Promise<ISuggestionItem[]> => {
  if (mapDepth(argument.path) > 1) {
    return [];
  }

  const keys = context.ir.written.filter(
    (written) => partOf(written.id) === 'map_key' && mapDepth(pathOf(written)) === 1
  );

  if (partOf(argument.id) === 'map_key') {
    const used = keys.filter(({ open }) => !open).map(({ text }) => unquoted(text));

    return Object.entries(parameters)
      .filter(([name, parameter]) => !used.includes(name) && applies(parameter, context))
      .map(([name, parameter]) => buildMapKeySuggestion(name, keyType(parameter)));
  }

  const key = keys.at(-1);
  const parameter = key && parameters[unquoted(key.text)];

  if (!parameter || !applies(parameter, context)) {
    return [];
  }

  const isString = STRING_TYPES.includes(parameter.type);

  return (await valuesOf(parameter, context)).map((value) =>
    buildMapValueCompleteItem(isString ? `"${value}"` : value, value)
  );
};

/**
 * The options that can still be named: not used yet, and not in conflict with one that is.
 * An option is chosen with its assignment.
 */
export const provideOptionNames = (
  { options }: OptionNameRole,
  resolved: ResolvedRole,
  context: SuggestionContext
): ISuggestionItem[] => {
  const used = context.ir.written
    .filter((written) => !written.open && resolveRole(pathOf(written))?.id === resolved.id)
    .map(({ text }) => unquoted(text).toLowerCase());
  const isUsed = (name: string) => used.includes(name.toLowerCase());

  return Object.entries(options)
    .filter(([name]) => !isUsed(name))
    .filter(
      ([name, { conflictsWith = [] }]) =>
        !conflictsWith.some(isUsed) &&
        !Object.entries(options).some(
          ([other, facts]) => isUsed(other) && facts.conflictsWith?.includes(name)
        )
    )
    .map(([name]) =>
      withAutoSuggest({
        label: name,
        text: `${name} = `,
        kind: 'Reference',
        category: SuggestionCategory.LANGUAGE_KEYWORD,
      })
    );
};

/**
 * The roles a value can have, given the name another argument gives: the role listed for
 * that name, or the roles the named entity defines for its value.
 */
export const dependentRoles = (
  { on, roles, definedBy }: DependentValueRole,
  context: SuggestionContext
): ArgumentRole[] => {
  const name = writtenAt(context, on);

  if (name === undefined) {
    return [];
  }

  const listed = roles?.[name] ?? roles?.[name.toLowerCase()];

  return [
    ...(listed ? [listed] : []),
    ...(definedBy ? ENTITIES[definedBy].valueRoles?.(name) ?? [] : []),
  ];
};
