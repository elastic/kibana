/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type YAML from 'yaml';
import { monaco } from '@kbn/monaco';
import { getPathAtOffset } from '../../../../common/lib/yaml';

export interface StepInfo {
  stepIndex: number;
  stepNode: any;
  stepName: string;
  stepType: string;
  typeNode: any;
  stepPath: (string | number)[];
}

export interface StepRange {
  startLineNumber: number;
  endLineNumber: number;
  startColumn: number;
  endColumn: number;
}

/**
 * Unified step detection utility that finds all steps in a YAML document
 * Uses the same logic as the unified actions provider for consistency
 */
export function findAllSteps(
  yamlDocument: YAML.Document,
  model: monaco.editor.ITextModel
): StepInfo[] {
  const steps: StepInfo[] = [];
  const processedSteps = new Set<string>();

  if (!yamlDocument || !model) {
    return steps;
  }

  const totalLines = model.getLineCount();

  // Iterate through all lines looking for "type:" declarations
  for (let lineNumber = 1; lineNumber <= totalLines; lineNumber++) {
    const lineContent = model.getLineContent(lineNumber);

    // Look for "type:" lines that might be connector types
    if (lineContent.trim().startsWith('type:')) {
      const typeColonIndex = lineContent.indexOf('type:');
      const position = new monaco.Position(lineNumber, typeColonIndex + 6); // After "type:"
      const absolutePosition = model.getOffsetAt(position);

      try {
        const yamlPath = getPathAtOffset(yamlDocument, absolutePosition);

        // Check if this is within a step using the same logic as unified actions provider
        const stepsIndex = yamlPath.findIndex((segment) => segment === 'steps');
        if (stepsIndex !== -1 && yamlPath[stepsIndex + 1] !== undefined) {
          const stepIndex = parseInt(String(yamlPath[stepsIndex + 1]), 10);
          if (!isNaN(stepIndex)) {
            const stepKey = `step_${stepIndex}`;

            // Skip if we've already processed this step
            if (processedSteps.has(stepKey)) {
              // eslint-disable-next-line no-continue
              continue;
            }
            processedSteps.add(stepKey);

            // Get step node using the same path logic
            const stepPath = yamlPath.slice(0, stepsIndex + 2);
            const stepNode = yamlDocument.getIn(stepPath, true);

            if (stepNode) {
              const typeNode = (stepNode as any)?.get?.('type', true);
              const stepType = typeNode?.value;
              const stepName = (stepNode as any)?.get?.('name')?.value || `step_${stepIndex}`;

              if (stepType) {
                steps.push({
                  stepIndex,
                  stepNode,
                  stepName,
                  stepType,
                  typeNode,
                  stepPath,
                });
              }
            }
          }
        }
      } catch (error) {
        // Skip this position if there's an error
        // eslint-disable-next-line no-continue
        continue;
      }
    }
  }

  return steps;
}

/**
 * Get the Monaco range for a step node
 * Uses the YAML parser's actual range for accuracy
 */
export function getStepRange(stepNode: any, model: monaco.editor.ITextModel): monaco.Range | null {
  try {
    if (!stepNode.range || !model) {
      return null;
    }

    const [startOffset, , endOffset] = stepNode.range;
    const startPos = model.getPositionAt(startOffset);
    const endPos = model.getPositionAt(endOffset);

    // Use the YAML node's actual range, but stop before the next step
    let adjustedEndLine = endPos.lineNumber;
    let adjustedEndColumn = endPos.column;

    // Walk backwards from endPos to find the last line that belongs to this step
    while (adjustedEndLine > startPos.lineNumber) {
      const lineContent = model.getLineContent(adjustedEndLine);
      const trimmedContent = lineContent.trim();

      // If this line starts with '-', it's the beginning of the next step
      if (trimmedContent.startsWith('-')) {
        // Use the previous line as the end
        adjustedEndLine--;
        if (adjustedEndLine >= startPos.lineNumber) {
          adjustedEndColumn = model.getLineMaxColumn(adjustedEndLine);
        }
        break;
      }

      // If this line has content and doesn't start with '-', use it as the end
      if (trimmedContent.length > 0) {
        adjustedEndColumn = model.getLineMaxColumn(adjustedEndLine);
        break;
      }

      // If it's empty, move to the previous line
      adjustedEndLine--;
    }

    // Safety check: ensure we don't go beyond the start line
    if (adjustedEndLine < startPos.lineNumber) {
      adjustedEndLine = startPos.lineNumber;
      adjustedEndColumn = model.getLineMaxColumn(adjustedEndLine);
    }

    return new monaco.Range(
      startPos.lineNumber,
      startPos.column,
      adjustedEndLine,
      adjustedEndColumn
    );
  } catch (error) {
    // console.warn('getStepRange: Error calculating step range', error);
    return null;
  }
}

/**
 * Check if a position is within a step's range
 */
export function isPositionInStep(position: monaco.Position, stepRange: monaco.Range): boolean {
  return stepRange.containsPosition(position);
}

/**
 * Find the step that contains a given position
 */
export function findStepAtPosition(
  position: monaco.Position,
  steps: StepInfo[],
  model: monaco.editor.ITextModel
): StepInfo | null {
  for (const step of steps) {
    const stepRange = getStepRange(step.stepNode, model);
    if (stepRange && isPositionInStep(position, stepRange)) {
      return step;
    }
  }
  return null;
}
