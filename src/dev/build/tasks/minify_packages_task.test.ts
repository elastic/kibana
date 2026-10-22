/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fsp from 'fs/promises';
import Os from 'os';
import Path from 'path';
import { minifyFile } from './minify_packages_task';

describe('minifyFile', () => {
  it('strips whitespace and comments, keeping names and escaping non-ASCII', async () => {
    const dir = await Fsp.mkdtemp(Path.join(Os.tmpdir(), 'kbn-minify-'));
    const file = Path.join(dir, 'index.js');
    await Fsp.writeFile(
      file,
      [
        '// comment',
        'Worker = ((BaseWorker) => class Worker extends BaseWorker {})(Worker);',
        "const message = 'café';",
      ].join('\n')
    );

    await minifyFile(file);

    expect(await Fsp.readFile(file, 'utf8')).toBe(
      'Worker=(BaseWorker=>class Worker extends BaseWorker{})(Worker);const message="caf\\xe9";'
    );
    await Fsp.rm(dir, { recursive: true });
  });
});
