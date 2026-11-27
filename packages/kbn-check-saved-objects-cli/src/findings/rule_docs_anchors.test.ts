/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { RULE_DOCS_ANCHORS } from './types';

const SO_DOCS_PATH = join(REPO_ROOT, 'docs/extend/key-concepts/saved-objects');

// The docs site renders `## Heading [some-id]` with `id="some-id"`, and gives the `#` page title no id.
const getHeadingIds = (markdown: string): string[] =>
  Array.from(markdown.matchAll(/^#{2,6} .*\[([\w-]+)\]\s*$/gm), ([, id]) => id);

describe('RULE_DOCS_ANCHORS', () => {
  it.each(Object.entries(RULE_DOCS_ANCHORS))(
    '%s links to a heading in the Saved Objects docs',
    (_ruleId, anchor) => {
      const [page, id] = anchor.split('#');
      const markdown = readFileSync(`${SO_DOCS_PATH}${page}.md`, 'utf8');

      if (id !== undefined) {
        expect(getHeadingIds(markdown)).toContain(id);
      }
    }
  );
});
