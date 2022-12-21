/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { asyncForEachWithLimit } from '@kbn/std';

import { Rule } from '../lib/rule';
import { TypeScriptImportLocator } from '../lib/import_locator';
import { addReferences, removeReferences } from '../ast';

export const referenceUsedPkgs = Rule.create('referenceUsedPkgs', {
  async check(project) {
    const importLocator = this.getCache(() => new TypeScriptImportLocator());
    const usedPkgIds = new Set<string>();

    await asyncForEachWithLimit(this.getAllFiles(), 20, async (path) => {
      if (!path.isTypeScript() && !path.isJavaScript()) {
        return;
      }

      for (const req of await importLocator.get(path)) {
        if (!req.startsWith('@kbn/')) {
          continue;
        }

        const [, id] = req.split('/');
        usedPkgIds.add(`@kbn/${id}`);
      }
    });

    const refs = new Set(
      (project.config.kbn_references ?? []).flatMap((r) => (typeof r === 'string' ? r : []))
    );
    const missing = new Set<string>();
    const extra = new Set<string>(refs);
    for (const used of usedPkgIds) {
      extra.delete(used);
      if (!refs.has(used)) {
        missing.add(used);
      }
    }

    if (missing.size) {
      const ids = Array.from(missing);
      const list = ids.map((id) => ` - ${id}`).join('\n');
      this.err(
        `the following packages are referenced in the code of this package but not listed in kbn_references:\n${list}`,
        (source) => addReferences(source, ids)
      );
    }

    if (extra.size) {
      const ids = Array.from(extra);
      const list = ids.map((id) => ` - ${id}`).join('\n');
      this.err(
        `the following packages are listed in kbn_references but there are no detectable references in the code:\n${list}`,
        (source) => removeReferences(source, ids)
      );
    }
  },
});
