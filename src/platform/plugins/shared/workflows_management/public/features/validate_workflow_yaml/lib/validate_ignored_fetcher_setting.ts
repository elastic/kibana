/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LineCounter } from 'yaml';
import { isMap, isPair, isScalar } from 'yaml';
import { IGNORED_KIBANA_FETCHER_SETTING_MESSAGE, isKibanaWorkflowStepType } from '@kbn/workflows';
import type { WorkflowLookup } from '../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';
import type { YamlValidationResult } from '../model/types';

export function validateIgnoredFetcherSetting(
  workflowLookup: WorkflowLookup,
  lineCounter: LineCounter
): YamlValidationResult[] {
  const results: YamlValidationResult[] = [];

  for (const step of Object.values(workflowLookup.steps)) {
    if (isKibanaWorkflowStepType(step.stepType)) {
      const fetcherKey = findWithFetcherKey(step.stepYamlNode);
      if (fetcherKey?.range) {
        const [startOffset, endOffset] = fetcherKey.range;
        const startPos = lineCounter.linePos(startOffset);
        const endPos = lineCounter.linePos(endOffset);

        results.push({
          id: `ignored-fetcher-setting-${step.stepId}-${startPos.line}-${startPos.col}`,
          owner: 'deprecated-step-validation',
          ruleId: 'ignoredFetcherSetting',
          severity: 'warning',
          message: IGNORED_KIBANA_FETCHER_SETTING_MESSAGE,
          hoverMessage: null,
          startLineNumber: startPos.line,
          startColumn: startPos.col,
          endLineNumber: endPos.line,
          endColumn: endPos.col,
        });
      }
    }
  }

  return results;
}

function findWithFetcherKey(stepYamlNode: WorkflowLookup['steps'][string]['stepYamlNode']) {
  const withPair = stepYamlNode.items.find(
    (item) => isPair(item) && isScalar(item.key) && item.key.value === 'with'
  );
  if (!withPair || !isPair(withPair) || !isMap(withPair.value)) {
    return undefined;
  }

  const fetcherPair = withPair.value.items.find(
    (item) => isPair(item) && isScalar(item.key) && item.key.value === 'fetcher'
  );
  if (!fetcherPair || !isPair(fetcherPair) || !isScalar(fetcherPair.key)) {
    return undefined;
  }

  return fetcherPair.key;
}
