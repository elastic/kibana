/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import { withPageKey } from './page_key';

interface PageDocument {
  definition: WorkflowYaml | null;
  pageKey?: string;
}

const definitionWith = (types: string[]) =>
  ({ triggers: types.map((type) => ({ type })) } as unknown as WorkflowYaml);

const save = (document: PageDocument): PageDocument => withPageKey(document);

describe('withPageKey', () => {
  it('assigns a random key on the first save with a page trigger', () => {
    const first = save({ definition: definitionWith(['page']) });
    const second = save({ definition: definitionWith(['page']) });

    expect(first.pageKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(first.pageKey).not.toBe(second.pageKey);
  });

  it('keeps an existing key, so later saves never move the URL', () => {
    expect(save({ definition: definitionWith(['page']), pageKey: 'existing' }).pageKey).toBe(
      'existing'
    );
  });

  it('assigns nothing to a workflow without a page trigger', () => {
    expect(save({ definition: definitionWith(['manual']) }).pageKey).toBeUndefined();
    expect(save({ definition: null }).pageKey).toBeUndefined();
  });
});
