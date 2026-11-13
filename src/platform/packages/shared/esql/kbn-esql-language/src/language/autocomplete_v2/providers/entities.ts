/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSafeInsertText } from '../../../commands/definitions/utils/autocomplete/helpers';
import { withAutoSuggest } from '../../../commands/definitions/utils/autocomplete/helpers';
import type { ISuggestionItem } from '../../../commands/registry/types';
import {
  resolveRole,
  type EntityItem,
  type EntityRole,
  type EntityScope,
  type EntityType,
  type ResolvedRole,
} from '../../../esql_js_sim/definitions';
import { ENTITIES } from '../entities/registry';
import type { SuggestionContext } from '../types';

/** How an entity of each kind looks in the list. */
const ENTITY_KINDS: Readonly<Record<EntityType, ISuggestionItem['kind']>> = {
  source: 'Issue',
  lookup_index: 'Issue',
  enrich_policy: 'Class',
  enrich_field: 'Variable',
  inference_endpoint: 'Reference',
  metadata_field: 'Constant',
  setting: 'Reference',
};

// A name with a dash or a wildcard needs no quoting in these places.
const NAMES_AS_TYPED: readonly EntityType[] = [
  'source',
  'lookup_index',
  'metadata_field',
  'setting',
];

/** The path of a written argument, as `resolveRole` takes it. */
const roleIdOf = (argument: SuggestionContext['ir']['written'][number]): string | undefined =>
  resolveRole([...argument.ancestors.map((ancestor) => ancestor.id), argument.id])?.id;

const unquoted = (text: string): string => text.replace(/^[`"]|[`"]$/g, '');

/** What narrows the entities at the cursor: what the role says, and what is written. */
const toScope = (role: EntityRole, { ir, callbacks }: SuggestionContext): EntityScope => {
  const parent = role.dependsOn
    ? ir.written.find(({ id }) => id === role.dependsOn)?.text
    : undefined;

  return {
    indexMode: role.indexMode,
    inSubquery: ir.enclosingCommands.length > 0,
    parent: parent === undefined ? undefined : unquoted(parent),
    isServerless: callbacks?.isServerless ?? false,
  };
};

/**
 * What comes after the name when it is chosen. A list item gets nothing: a separator can
 * follow. A name that only one symbol can follow gets that symbol, as a setting gets its `=`.
 * Any other name gets a space.
 */
const suffixAfterName = ({ afterName }: SuggestionContext): string => {
  if (afterName.position === 'invalid') {
    return '';
  }
  if (afterName.followers.some((follower) => follower.class === 'separator')) {
    return '';
  }

  const [only] = afterName.followers;
  const isOnlySymbol =
    afterName.followers.length === 1 &&
    !afterName.arguments.length &&
    only.class === 'operator' &&
    only.text !== undefined;

  return isOnlySymbol ? ` ${only.text} ` : ' ';
};

const toSuggestion = (
  name: string,
  { description, category }: EntityItem,
  entityType: EntityType,
  suffix: string,
  detail = category
): ISuggestionItem => {
  const text = NAMES_AS_TYPED.includes(entityType)
    ? name
    : getSafeInsertText(name, { dashSupported: true });
  const item: ISuggestionItem = {
    label: name,
    text: `${text}${suffix}`,
    kind: ENTITY_KINDS[entityType],
    detail: detail ?? description,
  };

  return suffix ? withAutoSuggest(item) : item;
};

/**
 * The entities the role names, in the scope of the cursor. Hidden ones are left out, as are
 * the ones already listed where each is listed once. An alias is offered next to its entity.
 */
export const provideEntities = async (
  role: EntityRole,
  resolved: ResolvedRole,
  context: SuggestionContext
): Promise<ISuggestionItem[]> => {
  const items = await ENTITIES[role.entityType].fetch(
    context.callbacks ?? {},
    toScope(role, context)
  );
  const used = role.unique
    ? context.ir.written
        .filter((argument) => !argument.open && roleIdOf(argument) === resolved.id)
        .map(({ text }) => unquoted(text))
    : [];
  const suffix = suffixAfterName(context);
  const visible = items.filter(({ hidden, name }) => !hidden && !used.includes(name));

  return [
    ...visible.map((item) => toSuggestion(item.name, item, role.entityType, suffix)),
    ...visible.flatMap((item) =>
      (item.aliases ?? [])
        .filter((alias) => !used.includes(alias))
        .map((alias) => toSuggestion(alias, item, role.entityType, suffix, 'Alias'))
    ),
  ];
};
