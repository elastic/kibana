/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fsp from 'fs/promises';

import globby from 'globby';
import { asyncMapWithLimit } from '@kbn/std';
import Yaml from 'js-yaml';

const FM_SEP_RE = /^---$/m;

export async function getAllDocFileIds(outputDir: string) {
  const paths = await globby(['**/*.mdx'], {
    cwd: outputDir,
    absolute: true,
    unique: true,
  });

  const ids = await asyncMapWithLimit(paths, 20, async (path) => {
    const content = await Fsp.readFile(path, 'utf8');

    const fmStart = content.match(FM_SEP_RE);
    if (fmStart?.index === undefined) {
      throw new Error(`unable to find start of frontmatter in ${path}`);
    }
    const fmYaml = content.slice(fmStart.index + fmStart[0].length);

    const fmEnd = fmYaml.match(FM_SEP_RE);
    if (fmEnd?.index === undefined) {
      throw new Error(`unable to find end of frontmatter in ${path}`);
    }

    let fm;
    try {
      fm = Yaml.safeLoad(fmYaml.slice(0, fmEnd.index));
      if (typeof fm !== 'object' || fm === null) {
        throw new Error('expected yaml to produce an object');
      }
    } catch (err) {
      throw new Error(`unable to parse frontmatter in ${path}: ${err.message}`);
    }

    const id = fm.id;
    if (typeof id !== 'string') {
      throw new Error(`missing "id" in frontmatter in ${path}`);
    }

    return id;
  });

  return ids.flat();
}
