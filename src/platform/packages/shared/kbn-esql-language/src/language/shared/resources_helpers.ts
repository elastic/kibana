/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCallbacks } from '@kbn/esql-types';

export function getPolicyHelper(resourceRetriever?: ESQLCallbacks) {
  const getPolicies = async () => {
    return (await resourceRetriever?.getPolicies?.()) || [];
  };
  return {
    getPolicies: async () => {
      const policies = await getPolicies();
      return policies;
    },
    getPolicyMetadata: async (policyName: string) => {
      const policies = await getPolicies();
      return policies.find(({ name }) => name === policyName);
    },
  };
}

export function getSourcesHelper(resourceRetriever?: ESQLCallbacks) {
  return async () => {
    return (await resourceRetriever?.getSources?.()) || [];
  };
}

export async function getFromCommandHelper(resourceRetriever?: ESQLCallbacks): Promise<string> {
  const getSources = getSourcesHelper(resourceRetriever);
  const sources = await getSources?.();
  const visibleSources = sources.filter((source) => !source.hidden) || [];

  if (visibleSources.find((source) => source.name.startsWith('logs'))) {
    return 'FROM logs*';
  }

  if (visibleSources.length > 0) {
    return `FROM ${visibleSources[0].name}`;
  }
  return '';
}
