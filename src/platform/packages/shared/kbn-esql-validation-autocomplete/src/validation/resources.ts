/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCommand } from '@kbn/esql-ast';
import { createMapFromList, isSourceItem, nonNullable } from '../shared/helpers';
import {
  getFieldsByTypeHelper,
  getPolicyHelper,
  getSourcesHelper,
} from '../shared/resources_helpers';
import type { ESQLCallbacks } from '../shared/types';
import {
  buildQueryForFieldsForStringSources,
  buildQueryForFieldsFromSource,
  buildQueryForFieldsInPolicies,
} from './helpers';
import type { ESQLRealField, ESQLPolicy } from './types';

export async function retrieveFields(
  queryString: string,
  commands: ESQLCommand[],
  callbacks?: ESQLCallbacks
): Promise<Map<string, ESQLRealField>> {
  if (!callbacks || commands.length < 1) {
    return new Map();
  }
  // Do not fetch fields, if query has only one source command and that command
  // does not require fields.
  if (commands.length === 1) {
    switch (commands[0].name) {
      case 'from':
      case 'show':
      case 'row': {
        return new Map();
      }
    }
  }
  if (commands[0].name === 'row') {
    return new Map();
  }
  const customQuery = buildQueryForFieldsFromSource(queryString, commands);
  return await getFieldsByTypeHelper(customQuery, callbacks).getFieldsMap();
}

export async function retrievePolicies(
  commands: ESQLCommand[],
  callbacks?: ESQLCallbacks
): Promise<Map<string, ESQLPolicy>> {
  if (!callbacks || commands.every(({ name }) => name !== 'enrich')) {
    return new Map();
  }

  const policies = await getPolicyHelper(callbacks).getPolicies();
  return createMapFromList(policies);
}

export async function retrieveSources(
  commands: ESQLCommand[],
  callbacks?: ESQLCallbacks
): Promise<Set<string>> {
  if (!callbacks || commands.length < 1) {
    return new Set();
  }
  if (['row', 'show', 'meta'].includes(commands[0].name)) {
    return new Set();
  }
  const sources = await getSourcesHelper(callbacks)();
  return new Set(sources.map(({ name }) => name));
}

export async function retrievePoliciesFields(
  commands: ESQLCommand[],
  policies: Map<string, ESQLPolicy>,
  callbacks?: ESQLCallbacks
): Promise<Map<string, ESQLRealField>> {
  if (!callbacks) {
    return new Map();
  }
  const enrichCommands = commands.filter(({ name }) => name === 'enrich');
  if (!enrichCommands.length) {
    return new Map();
  }
  const policyNames = enrichCommands
    .map(({ args }) => (isSourceItem(args[0]) ? args[0].name : undefined))
    .filter(nonNullable);
  if (!policyNames.every((name) => policies.has(name))) {
    return new Map();
  }

  const customQuery = buildQueryForFieldsInPolicies(
    policyNames.map((name) => policies.get(name)) as ESQLPolicy[]
  );
  return await getFieldsByTypeHelper(customQuery, callbacks).getFieldsMap();
}

export async function retrieveFieldsFromStringSources(
  queryString: string,
  commands: ESQLCommand[],
  callbacks?: ESQLCallbacks
): Promise<Map<string, ESQLRealField>> {
  if (!callbacks) {
    return new Map();
  }
  const customQuery = buildQueryForFieldsForStringSources(queryString, commands);
  return await getFieldsByTypeHelper(customQuery, callbacks).getFieldsMap();
}
