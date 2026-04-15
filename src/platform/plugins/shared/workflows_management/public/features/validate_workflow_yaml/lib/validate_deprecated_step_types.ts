/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LineCounter } from 'yaml';
import { getDeprecatedStepMessage } from '@kbn/workflows';
import { getDeprecatedStepMetadataMap } from '../../../../common/schema';
import type { WorkflowLookup } from '../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';
import type { YamlValidationResult } from '../model/types';

export function validateDeprecatedStepTypes(
  workflowLookup: WorkflowLookup,
  lineCounter: LineCounter
): YamlValidationResult[] {
  const results: YamlValidationResult[] = [];
  const deprecatedStepMetadata = getDeprecatedStepMetadataMap();

  for (const step of Object.values(workflowLookup.steps)) {
    const deprecation = deprecatedStepMetadata[step.stepType];
    const typeProp = step.propInfos.type;

    if (deprecation && typeProp?.valueNode.range) {
      const [startOffset, endOffset] = typeProp.valueNode.range;
      const startPos = lineCounter.linePos(startOffset);
      const endPos = lineCounter.linePos(endOffset);
      const message = getDeprecatedStepMessage(step.stepType, deprecation);

      results.push({
        id: `deprecated-step-type-${step.stepId}-${startPos.line}-${startPos.col}`,
        owner: 'deprecated-step-validation',
        severity: 'warning',
        message,
        hoverMessage: null,
        startLineNumber: startPos.line,
        startColumn: startPos.col,
        endLineNumber: endPos.line,
        endColumn: endPos.col,
      });
    }
  }

  return results;
}
