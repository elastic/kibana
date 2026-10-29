/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isMap, isSeq, parse, parseDocument } from 'yaml';
import type { YAMLMap } from 'yaml';
import type { YamlValidationResult } from '@kbn/workflows-yaml';
import {
  buildStepFragmentVirtualYaml,
  mapValidationResultsToFragment,
  type StepFragmentVirtualYaml,
  toFragmentRange,
  toFragmentSuggestion,
  toVirtualPosition,
} from './step_fragment_virtual_yaml';

const BASE = `name: demo
triggers:
  - type: manual
steps:
  - name: first
    type: console
    with:
      message: hello
  - name: second
    type: http
    with:
      url: https://example.com
`;

/** Minimal standalone step locator — mirrors `getStepSourceRange` without depending on it. */
const findStepRange = (workflowYaml: string, stepName: string): readonly [number, number] => {
  const find = (node: unknown): YAMLMap | undefined => {
    if (isSeq(node)) {
      for (const item of node.items) {
        if (isMap(item) && item.get('name') === stepName) return item;
        const found = find(item);
        if (found) return found;
      }
    } else if (isMap(node)) {
      for (const pair of node.items) {
        const found = find((pair as { value: unknown }).value);
        if (found) return found;
      }
    }
    return undefined;
  };
  const doc = parseDocument(workflowYaml);
  const node = isMap(doc.contents) ? find(doc.contents.get('steps')) : undefined;
  if (!node?.range) throw new Error(`step "${stepName}" not found`);
  return [node.range[0], node.range[1]];
};

const buildVirtualFor = (workflowYaml: string, stepName: string, fragment: string) =>
  buildStepFragmentVirtualYaml(workflowYaml, findStepRange(workflowYaml, stepName), fragment);

describe('buildStepFragmentVirtualYaml', () => {
  it('splices a top-level step back in, re-indenting lines after the first', () => {
    const fragment = 'name: first\ntype: console\nwith:\n  message: hi there\n';
    const virtual = buildVirtualFor(BASE, 'first', fragment);

    expect(virtual.columnOffset).toBe(4); // '  - '.length
    expect(virtual.lineCount).toBe(5); // trailing '\n' counts as one more (empty) line
    expect(parse(virtual.yaml)).toEqual(parse(BASE.replace('hello', 'hi there')));
    expect(virtual.yaml).toContain(
      '  - name: first\n    type: console\n    with:\n      message: hi there\n'
    );
  });

  it('splices the last step, preserving whatever follows end-of-document', () => {
    const fragment = 'name: second\ntype: http\nwith:\n  url: https://changed.example\n';
    const virtual = buildVirtualFor(BASE, 'second', fragment);

    expect(parse(virtual.yaml)).toEqual(
      parse(BASE.replace('https://example.com', 'https://changed.example'))
    );
  });

  it('splices a step nested in an if branch, offsetting by the nested column', () => {
    const withIf = `name: demo
steps:
  - name: gate
    type: if
    condition: x
    steps:
      - name: yes
        type: console
`;
    const fragment = 'name: yes\ntype: console\nwith:\n  message: hi\n';
    const virtual = buildVirtualFor(withIf, 'yes', fragment);

    expect(virtual.columnOffset).toBe(8); // '      - '.length
    const parsed = parse(virtual.yaml);
    expect(parsed.steps[0].steps[0]).toEqual({
      name: 'yes',
      type: 'console',
      with: { message: 'hi' },
    });
  });

  it('splices a fallback step under on-failure', () => {
    const withFallback = `name: demo
steps:
  - name: first
    type: console
    on-failure:
      fallback:
        - name: recover
          type: console
`;
    const fragment = 'name: recover\ntype: console\nwith:\n  message: sorry\n';
    const virtual = buildVirtualFor(withFallback, 'recover', fragment);

    const parsed = parse(virtual.yaml);
    expect(parsed.steps[0]['on-failure'].fallback[0]).toEqual({
      name: 'recover',
      type: 'console',
      with: { message: 'sorry' },
    });
  });

  it('produces a document with zero parse errors for an empty fragment', () => {
    const virtual = buildVirtualFor(BASE, 'first', '');
    expect(parseDocument(virtual.yaml).errors).toHaveLength(0);
  });

  it('handles a fragment with a trailing newline without duplicating content', () => {
    const fragment = 'name: first\ntype: console\n';
    const virtual = buildVirtualFor(BASE, 'first', fragment);
    expect(parseDocument(virtual.yaml).errors).toHaveLength(0);
    expect(parse(virtual.yaml).steps[0]).toEqual({ name: 'first', type: 'console' });
  });
});

describe('toVirtualPosition / toFragmentRange', () => {
  const virtual: StepFragmentVirtualYaml = {
    yaml: 'unused for these pure coordinate mappings',
    startLineNumber: 5,
    columnOffset: 4,
    lineCount: 3,
  };

  it('maps a fragment position to the virtual document', () => {
    expect(toVirtualPosition({ lineNumber: 1, column: 1 }, virtual)).toEqual({
      lineNumber: 5,
      column: 5,
    });
    expect(toVirtualPosition({ lineNumber: 2, column: 3 }, virtual)).toEqual({
      lineNumber: 6,
      column: 7,
    });
  });

  it('maps a virtual range back to fragment coordinates', () => {
    expect(
      toFragmentRange(
        { startLineNumber: 5, startColumn: 5, endLineNumber: 6, endColumn: 9 },
        virtual
      )
    ).toEqual({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 2,
      endColumn: 5,
    });
  });

  it('clamps mapped columns to at least 1', () => {
    expect(
      toFragmentRange(
        { startLineNumber: 5, startColumn: 1, endLineNumber: 5, endColumn: 2 },
        virtual
      )
    ).toEqual({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 1,
    });
  });
});

describe('mapValidationResultsToFragment', () => {
  const virtual: StepFragmentVirtualYaml = {
    yaml: 'unused',
    startLineNumber: 5,
    columnOffset: 4,
    lineCount: 3,
  };

  const makeResult = (
    overrides: Partial<YamlValidationResult> & Pick<YamlValidationResult, 'startLineNumber'>
  ): YamlValidationResult =>
    ({
      id: 'r',
      owner: 'step-property-validation',
      ruleId: null,
      severity: 'error',
      message: 'bad',
      startColumn: 5,
      endLineNumber: overrides.startLineNumber,
      endColumn: 9,
      hoverMessage: null,
      ...overrides,
    } as unknown as YamlValidationResult);

  it('shifts a result inside the step into fragment coordinates', () => {
    const results = [makeResult({ startLineNumber: 6, startColumn: 5, endColumn: 9 })];
    expect(mapValidationResultsToFragment(results, virtual)).toEqual([
      expect.objectContaining({
        startLineNumber: 2,
        startColumn: 1,
        endLineNumber: 2,
        endColumn: 5,
      }),
    ]);
  });

  it('drops a result before or after the step', () => {
    const before = makeResult({ startLineNumber: 4 });
    const after = makeResult({ startLineNumber: 8 });
    expect(mapValidationResultsToFragment([before, after], virtual)).toEqual([]);
  });

  it('clamps an endLineNumber that spills past the step to the last fragment line', () => {
    const spilling = makeResult({ startLineNumber: 5, endLineNumber: 9 });
    const [mapped] = mapValidationResultsToFragment([spilling], virtual);
    expect(mapped.endLineNumber).toBe(virtual.lineCount);
  });
});

describe('toFragmentSuggestion', () => {
  const virtual: StepFragmentVirtualYaml = {
    yaml: 'unused',
    startLineNumber: 5,
    columnOffset: 4,
    lineCount: 3,
  };

  it('maps a plain IRange', () => {
    const suggestion = toFragmentSuggestion(
      {
        label: 'type',
        insertText: 'type',
        range: { startLineNumber: 5, startColumn: 5, endLineNumber: 5, endColumn: 9 },
        kind: 0,
      } as any,
      virtual
    );
    expect(suggestion.range).toEqual({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 5,
    });
  });

  it('maps an { insert, replace } range', () => {
    const suggestion = toFragmentSuggestion(
      {
        label: 'type',
        insertText: 'type',
        range: {
          insert: { startLineNumber: 5, startColumn: 5, endLineNumber: 5, endColumn: 5 },
          replace: { startLineNumber: 5, startColumn: 5, endLineNumber: 5, endColumn: 9 },
        },
        kind: 0,
      } as any,
      virtual
    );
    expect(suggestion.range).toEqual({
      insert: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
      replace: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 5 },
    });
  });

  it('maps additionalTextEdits inside the step and drops ones outside it', () => {
    const suggestion = toFragmentSuggestion(
      {
        label: 'with',
        insertText: 'with',
        range: { startLineNumber: 5, startColumn: 5, endLineNumber: 5, endColumn: 5 },
        kind: 0,
        additionalTextEdits: [
          {
            range: { startLineNumber: 6, startColumn: 1, endLineNumber: 6, endColumn: 1 },
            text: '  inside: true\n',
          },
          {
            range: { startLineNumber: 20, startColumn: 1, endLineNumber: 20, endColumn: 1 },
            text: 'outside: true\n',
          },
        ],
      } as any,
      virtual
    );
    expect(suggestion.additionalTextEdits).toEqual([
      expect.objectContaining({
        range: { startLineNumber: 2, startColumn: 1, endLineNumber: 2, endColumn: 1 },
        text: '  inside: true\n',
      }),
    ]);
  });
});
