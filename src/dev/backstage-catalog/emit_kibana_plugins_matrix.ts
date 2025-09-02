#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Emit a GitHub Actions matrix of Kibana plugins by scanning kibana.jsonc files.
 * Output keys: id, title, description, owner, folder, type (plugin|package)
 */

import { REPO_ROOT } from '@kbn/repo-info';
import { getPackages } from '@kbn/repo-packages';

const items = getPackages(REPO_ROOT).map((p) => {
  const id = p.manifest.id;
  const title = `Kibana ${(p.name || p.manifest.id)
    .replace('@kbn/', '')
    .split('-')
    .map((part) => `${part[0].toLocaleUpperCase()}${part.substring(1)}`)
    .join(' ')}`;
  const desc = p.manifest.description || '';
  const owner = p.manifest.owner?.map((team) => team.replace('@elastic', '')) || 'unknown';
  const type = p.manifest.type === 'plugin' ? 'plugin' : 'package';
  const folder = `https://github.com/elastic/kibana/tree/main${p.directory.replace(REPO_ROOT, '')}`;

  return {
    id,
    title,
    description: desc,
    owner,
    folder,
    type,
  };
});

// Emit a JSON object compatible with GitHub Actions dynamic matrices
// Usage in a workflow step:
//  - id: emit
//    run: |
//      node src/dev/backstage-catalog/emit_kibana_plugins_matrix.ts \
//        | tr -d '\n' \
//        | awk '{print "matrix=" $0}' >> "$GITHUB_OUTPUT"
//  - uses: actions/checkout@v4
//  - name: Use matrix
//    if: ${{ always() }}
//    run: echo "${{ toJson(fromJson(steps.emit.outputs.matrix)) }}"
process.stdout.write(JSON.stringify({ include: items }));
