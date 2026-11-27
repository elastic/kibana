/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { appDocumentSchema, collectSources, getDocumentIssues } from '@kbn/custom-app-common';
import { checkCapability, describeCapability, registerCapability } from '@kbn/custom-app-registry';
import { esqlEditorCapability } from './manifest';

const documentWith = (node: Record<string, unknown>, state: Record<string, unknown> = {}) => ({
  state,
  root: { type: 'stack', id: 'root', direction: 'vertical', children: [node] },
});

describe('the ES|QL editor capability', () => {
  beforeAll(() => registerCapability(esqlEditorCapability));

  it('has nothing wrong with it', () => {
    expect(checkCapability(esqlEditorCapability)).toEqual([]);
  });

  it('fetches by itself, so the app runs no query for it', () => {
    const parsed = appDocumentSchema.parse(
      documentWith({ type: 'esql_editor', id: 'explore', query: 'FROM logs-* | LIMIT 10' })
    );
    expect(collectSources(parsed.root)).toEqual({});
  });

  it('keeps the text in a declared text value of the app, when it is bound', () => {
    const issues = (state: Record<string, unknown>) =>
      getDocumentIssues(documentWith({ type: 'esql_editor', id: 'explore', bind: 'text' }, state));

    expect(issues({ text: { type: 'string', default: '' } })).toEqual([]);
    expect(issues({}).map(({ message }) => message)).toEqual([
      expect.stringContaining('unknown state key "text"'),
    ]);
    expect(issues({ text: { type: 'number', default: 1 } })).not.toEqual([]);
  });

  it('describes itself for an LLM from its manifest', () => {
    expect(describeCapability(esqlEditorCapability)).toContain(
      '- esql_editor { title?, query?, bind? }'
    );
  });
});
