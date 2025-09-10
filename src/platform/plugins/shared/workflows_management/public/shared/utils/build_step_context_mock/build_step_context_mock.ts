/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowGraph } from '@kbn/workflows/graph';
import { findInputsInGraph } from '@kbn/workflows/common/utils';

import type { StepContext } from '@kbn/workflows';

function parseJsPropertyAccess(path: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inBracket = false;

  for (let i = 0; i < path.length; i++) {
    const char = path[i];

    if (char === '.' && !inBracket) {
      if (current) {
        parts.push(current);
        current = '';
      }
    } else if (char === '[') {
      inBracket = true;
      if (current) {
        parts.push(current);
        current = '';
      }
    } else if (char === ']') {
      inBracket = false;
      if (current) {
        parts.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

export function buildStepContextMock(workflowGraph: WorkflowGraph): Partial<StepContext> {
  const stepContextMock = {} as Partial<StepContext>;
  const inputsInGraph = findInputsInGraph(workflowGraph);
  const allInputsParsed = Object.values(inputsInGraph)
    .flat()
    .map((input) => parseJsPropertyAccess(input));
  const stepVariables = allInputsParsed.filter((input) => input[0] === 'steps');

  stepVariables.forEach((parsed) => {
    const stepName = parsed.slice(1, 2).join();
    const stepStateKey = parsed.slice(2, 3).join();

    if (!['output', 'error'].includes(stepStateKey)) {
      return;
    }

    if (!stepContextMock.steps) {
      stepContextMock.steps = {};
    }

    if (!stepContextMock.steps[stepName]) {
      stepContextMock.steps[stepName] = {} as Partial<StepContext['steps']>;
    }

    switch (stepStateKey) {
      case 'output': {
        stepContextMock.steps[stepName][stepStateKey] = {};
        break;
      }
      case 'error': {
        stepContextMock.steps[stepName][stepStateKey] = null;
        break;
      }
    }
  });

  if (allInputsParsed.some((input) => input[0] === 'event')) {
    stepContextMock.event = {};
  }

  const foreachInputs = allInputsParsed.filter((input) => input[0] === 'foreach');

  if (foreachInputs.length) {
    if (foreachInputs.some((x) => x.length === 1 && x[0] === 'foreach')) {
      stepContextMock.foreach = {
        item: {},
        items: [],
        index: 0,
        total: 0,
      };
    } else {
      if (!stepContextMock.foreach) {
        stepContextMock.foreach = {} as StepContext['foreach'];
      }

      const itemReference = foreachInputs.find(
        (input) => input[0] === 'foreach' && input[1] === 'item'
      );

      if (itemReference) {
        stepContextMock.foreach!.item = {};
      }
    }
  }

  return stepContextMock;
}
