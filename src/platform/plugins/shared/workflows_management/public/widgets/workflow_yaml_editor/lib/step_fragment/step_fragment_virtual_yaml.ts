/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import type { YamlValidationResult } from '@kbn/workflows-yaml';

/**
 * A step's de-indented YAML fragment, spliced back into its original position
 * in the full workflow YAML (the "virtual" document) so it can be validated
 * and autocompleted as if it were still inline. `columnOffset` is the same
 * for every fragment line because the splice re-indents each line after the
 * first by that exact amount (see {@link buildStepFragmentVirtualYaml}), so
 * fragment-to-virtual coordinate mapping is a uniform per-line shift.
 */
export interface StepFragmentVirtualYaml {
  /** Full workflow YAML with the live fragment text spliced in at the step's position. */
  readonly yaml: string;
  /** 1-based line, in `yaml`, of the fragment's first line. */
  readonly startLineNumber: number;
  /** 0-based column, in `yaml`, where every fragment line starts once re-indented. */
  readonly columnOffset: number;
  /** Number of lines in the fragment text. */
  readonly lineCount: number;
}

/**
 * Splices `fragment` (a de-indented step YAML mapping) into `workflowYaml` at
 * `stepRange` (the `[start, end)` character offsets of the step's source
 * text, from {@link getStepSourceRange}), re-indenting every fragment line
 * after the first by the step's own column so the result parses exactly as
 * if the fragment were still nested at that position.
 */
export const buildStepFragmentVirtualYaml = (
  workflowYaml: string,
  stepRange: readonly [number, number],
  fragment: string
): StepFragmentVirtualYaml => {
  const [start, end] = stepRange;
  const precedingNewline = workflowYaml.lastIndexOf('\n', start - 1);
  const columnOffset = start - precedingNewline - 1;
  const pad = ' '.repeat(columnOffset);
  const fragmentLines = fragment.split('\n');
  const indentedFragment = fragmentLines
    .map((line, index) => (index === 0 ? line : pad + line))
    .join('\n');
  const yaml = `${workflowYaml.slice(0, start)}${indentedFragment}\n${workflowYaml.slice(end)}`;
  const startLineNumber = workflowYaml.slice(0, start).split('\n').length;
  return { yaml, startLineNumber, columnOffset, lineCount: fragmentLines.length };
};

const isLineWithinFragment = (lineNumber: number, virtual: StepFragmentVirtualYaml): boolean =>
  lineNumber >= virtual.startLineNumber && lineNumber < virtual.startLineNumber + virtual.lineCount;

/** Maps a position in the fragment editor to the equivalent position in the virtual document. */
export const toVirtualPosition = (
  position: monaco.IPosition,
  virtual: StepFragmentVirtualYaml
): monaco.IPosition => ({
  lineNumber: virtual.startLineNumber + position.lineNumber - 1,
  column: position.column + virtual.columnOffset,
});

/** Maps a range in the virtual document back to the equivalent range in the fragment editor. */
export const toFragmentRange = (
  range: monaco.IRange,
  virtual: StepFragmentVirtualYaml
): monaco.IRange => ({
  startLineNumber: range.startLineNumber - virtual.startLineNumber + 1,
  startColumn: Math.max(1, range.startColumn - virtual.columnOffset),
  endLineNumber: range.endLineNumber - virtual.startLineNumber + 1,
  endColumn: Math.max(1, range.endColumn - virtual.columnOffset),
});

/**
 * Maps full-document validation results back to fragment coordinates,
 * dropping anything that falls outside the step (e.g. a cascading parse
 * error, or a result for a sibling step).
 */
export const mapValidationResultsToFragment = (
  results: readonly YamlValidationResult[],
  virtual: StepFragmentVirtualYaml
): YamlValidationResult[] =>
  results
    .filter((result) => isLineWithinFragment(result.startLineNumber, virtual))
    .map((result) => ({
      ...result,
      startLineNumber: result.startLineNumber - virtual.startLineNumber + 1,
      startColumn: Math.max(1, result.startColumn - virtual.columnOffset),
      endLineNumber: Math.min(
        result.endLineNumber - virtual.startLineNumber + 1,
        virtual.lineCount
      ),
      endColumn: Math.max(1, result.endColumn - virtual.columnOffset),
    }));

const mapSuggestionRange = (
  range: monaco.languages.CompletionItem['range'],
  virtual: StepFragmentVirtualYaml
): monaco.languages.CompletionItem['range'] =>
  'insert' in range && 'replace' in range
    ? {
        insert: toFragmentRange(range.insert, virtual),
        replace: toFragmentRange(range.replace, virtual),
      }
    : toFragmentRange(range, virtual);

/**
 * Maps a completion item computed against the virtual document back to
 * fragment coordinates. `additionalTextEdits` that land outside the step
 * (e.g. scaffolding written elsewhere in the workflow) are dropped rather
 * than mapped, since they'd otherwise edit the wrong part of the fragment.
 */
export const toFragmentSuggestion = (
  suggestion: monaco.languages.CompletionItem,
  virtual: StepFragmentVirtualYaml
): monaco.languages.CompletionItem => ({
  ...suggestion,
  range: mapSuggestionRange(suggestion.range, virtual),
  additionalTextEdits: suggestion.additionalTextEdits
    ?.filter((edit) => isLineWithinFragment(edit.range.startLineNumber, virtual))
    .map((edit) => ({ ...edit, range: toFragmentRange(edit.range, virtual) })),
});
