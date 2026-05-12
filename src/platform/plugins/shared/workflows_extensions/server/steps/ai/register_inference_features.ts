/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SearchInferenceEndpointsPluginSetup } from '@kbn/search-inference-endpoints/server';

export const WORKFLOWS_AI_PARENT_FEATURE_ID = 'workflows_ai';
export const AI_PROMPT_FEATURE_ID = 'ai.prompt';
export const AI_SUMMARIZE_FEATURE_ID = 'ai.summarize';
export const AI_CLASSIFY_FEATURE_ID = 'ai.classify';

export const registerInferenceFeatures = (
  searchInferenceEndpoints: SearchInferenceEndpointsPluginSetup
) => {
  searchInferenceEndpoints.features.register({
    featureId: WORKFLOWS_AI_PARENT_FEATURE_ID,
    featureName: 'Workflows AI',
    featureDescription: 'AI models used for Workflows AI steps',
    taskType: 'chat_completion',
    recommendedEndpoints: [],
  });

  searchInferenceEndpoints.features.register({
    parentFeatureId: WORKFLOWS_AI_PARENT_FEATURE_ID,
    featureId: AI_PROMPT_FEATURE_ID,
    featureName: 'AI Prompt step',
    featureDescription: 'AI model used for the ai.prompt workflow step',
    taskType: 'chat_completion',
    recommendedEndpoints: [],
  });

  searchInferenceEndpoints.features.register({
    parentFeatureId: WORKFLOWS_AI_PARENT_FEATURE_ID,
    featureId: AI_SUMMARIZE_FEATURE_ID,
    featureName: 'AI Summarize step',
    featureDescription: 'AI model used for the ai.summarize workflow step',
    taskType: 'chat_completion',
    recommendedEndpoints: [],
  });

  searchInferenceEndpoints.features.register({
    parentFeatureId: WORKFLOWS_AI_PARENT_FEATURE_ID,
    featureId: AI_CLASSIFY_FEATURE_ID,
    featureName: 'AI Classify step',
    featureDescription: 'AI model used for the ai.classify workflow step',
    taskType: 'chat_completion',
    recommendedEndpoints: [],
  });
};
