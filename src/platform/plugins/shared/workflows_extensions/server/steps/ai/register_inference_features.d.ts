import type { SearchInferenceEndpointsPluginSetup } from '@kbn/search-inference-endpoints/server';
export { AI_CLASSIFY_FEATURE_ID, AI_PROMPT_FEATURE_ID, AI_SUMMARIZE_FEATURE_ID, WORKFLOWS_AI_PARENT_FEATURE_ID, WORKFLOWS_AI_RECOMMENDED_ENDPOINTS, } from './ai_feature_ids';
export declare const registerInferenceFeatures: (searchInferenceEndpoints: SearchInferenceEndpointsPluginSetup) => void;
