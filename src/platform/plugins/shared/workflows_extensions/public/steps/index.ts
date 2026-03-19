/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicStepRegistry } from '../step_registry';

export const registerInternalStepDefinitions = (stepRegistry: PublicStepRegistry) => {
  stepRegistry.register(() => import('./data/data_map_step').then((m) => m.dataMapStepDefinition));
  stepRegistry.register(() =>
    import('./data/data_dedupe_step').then((m) => m.dataDedupeStepDefinition)
  );
  stepRegistry.register(() =>
    import('./data/data_filter_step').then((m) => m.dataFilterStepDefinition)
  );
  stepRegistry.register(() =>
    import('./data/data_find_step').then((m) => m.dataFindStepDefinition)
  );
  stepRegistry.register(() =>
    import('./data/data_regex_extract_step').then((m) => m.dataRegexExtractStepDefinition)
  );
  stepRegistry.register(() =>
    import('./data/data_regex_replace_step').then((m) => m.dataRegexReplaceStepDefinition)
  );
  stepRegistry.register(() =>
    import('./data/data_aggregate_step').then((m) => m.dataAggregateStepDefinition)
  );
  stepRegistry.register(() => import('./ai/ai_prompt_step').then((m) => m.AiPromptStepDefinition));
  stepRegistry.register(() =>
    import('./ai/ai_summarize_step').then((m) => m.AiSummarizeStepDefinition)
  );
  stepRegistry.register(() =>
    import('./ai/ai_classify_step').then((m) => m.AiClassifyStepDefinition)
  );
  stepRegistry.register(() =>
    import('./data/data_stringify_json_step').then((m) => m.dataStringifyJsonStepDefinition)
  );
  stepRegistry.register(() =>
    import('./data/data_parse_json_step').then((m) => m.dataParseJsonStepDefinition)
  );
  stepRegistry.register(() =>
    import('./data/data_concat_step').then((m) => m.dataConcatStepDefinition)
  );
};
