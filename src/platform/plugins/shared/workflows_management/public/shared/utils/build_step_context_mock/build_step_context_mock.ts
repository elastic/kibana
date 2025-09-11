/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowGraph } from '@kbn/workflows/graph';
import {
  findInputsInGraph,
  extractSchemaPropertyPaths,
  parseJsPropertyAccess,
} from '@kbn/workflows/common/utils';

import type { StepContext } from '@kbn/workflows';
import { StepContextSchema } from '@kbn/workflows';

const StepContextSchemaPropertyPaths = extractSchemaPropertyPaths(StepContextSchema);

export function buildStepContextMock(workflowGraph: WorkflowGraph): Partial<StepContext> {
  const stepContextMock = {} as Record<string, any>;
  const inputsInGraph = findInputsInGraph(workflowGraph);
  const allInputs = Object.values(inputsInGraph).flat();
  const allInputsFiltered = allInputs.filter((input) =>
    StepContextSchemaPropertyPaths.some((schemaPropertyPath) =>
      input.startsWith(schemaPropertyPath.path)
    )
  );
  const inputsParsed = allInputsFiltered.map((input) => parseJsPropertyAccess(input));

  inputsParsed.forEach((pathParts) => {
    let current = stepContextMock;

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      const isLastPart = i === pathParts.length - 1;

      if (isLastPart) {
        // Set a default value for the final property
        current[part] = current[part] || null;
      } else {
        // Create nested object if it doesn't exist
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    }
  });

  return stepContextMock;
}
