/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLCallbacks } from '../shared/types';
import { getPolicyHelper, getSourcesHelper } from '../shared/resources_helpers';

export const getCommandContext = async (
  commandName: string,
  queryString: string,
  callbacks?: ESQLCallbacks
) => {
  const getSources = getSourcesHelper(callbacks);
  const helpers = getPolicyHelper(callbacks);
  switch (commandName) {
    case 'completion':
      const inferenceEndpoints =
        (await callbacks?.getInferenceEndpoints?.('completion'))?.inferenceEndpoints || [];
      return {
        inferenceEndpoints,
      };
    case 'enrich':
      const policies = await helpers.getPolicies();
      const policiesMap = new Map(policies.map((policy) => [policy.name, policy]));
      return {
        policies: policiesMap,
      };
    case 'from':
      const editorExtensions = (await callbacks?.getEditorExtensions?.(queryString)) ?? {
        recommendedQueries: [],
      };
      return {
        sources: await getSources(),
        editorExtensions,
      };
    case 'join':
      const joinSources = await callbacks?.getJoinIndices?.();
      return {
        joinSources: joinSources?.indices || [],
        supportsControls: callbacks?.canSuggestVariables?.() ?? false,
      };
    case 'stats':
      const histogramBarTarget = (await callbacks?.getPreferences?.())?.histogramBarTarget || 50;
      return {
        histogramBarTarget,
        supportsControls: callbacks?.canSuggestVariables?.() ?? false,
        variables: await callbacks?.getVariables?.(),
      };
    case 'fork':
      const enrichPolicies = await helpers.getPolicies();
      return {
        histogramBarTarget: (await callbacks?.getPreferences?.())?.histogramBarTarget || 50,
        joinSources: (await callbacks?.getJoinIndices?.())?.indices || [],
        supportsControls: callbacks?.canSuggestVariables?.() ?? false,
        policies: new Map(enrichPolicies.map((policy) => [policy.name, policy])),
        inferenceEndpoints:
          (await callbacks?.getInferenceEndpoints?.('completion'))?.inferenceEndpoints || [],
      };
    case 'ts':
      const timeseriesSources = await callbacks?.getTimeseriesIndices?.();
      return {
        timeSeriesSources: timeseriesSources?.indices || [],
        sources: await getSources(),
      };
    default:
      return {};
  }
};
