/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { promises as fs, readFileSync } from 'fs';
import * as path from 'path';
import globby from 'globby';
import stripJsonComments from 'strip-json-comments';

interface PackageManifest {
  type: string;
  id: string;
  description: string;
  devOnly: boolean;
  owner: string | string[];
}

async function main() {
  // We will create yml files for each package under a "locations/kibana" directory in a temp dir
  const targetDir = path.resolve('..', 'catalog-info', 'locations', 'kibana');

  await fs.mkdir(targetDir, { recursive: true });

  const packages = await getPackages();

  let counter = 0;

  for (const item of packages) {
    if (!item) continue;

    const id = item.id;

    if (!id) continue;

    const owner = Array.isArray(item.owner) ? item.owner.join(', ') : item.owner;

    const fileBase = `kibana-${id}`;

    const yaml = `# yaml-language-server: $schema=https://json.schemastore.org/catalog-info.json
  ---
  apiVersion: backstage.io/v1alpha1
  kind: Component
  metadata:
    name: ${item.id}
    title: ${item.title}
    description: ${item.desc}
    tags:
      - kibana
      - ${item.type}
    links:
      - url: ${item.folder}
        title: Source (elastic/kibana)
        icon: github
  spec:
    type: ${item.type}
    lifecycle: production
    owner: ${owner}
    subcomponentOf: kibana
`;

    const filePath = path.join(targetDir, `${fileBase}.yml`);

    // Write the file for this package
    await fs.writeFile(filePath, yaml, 'utf8');
    counter++;
  }

  console.log(`Generated ${counter} component file(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function getPackages() {
  const cwd = process.cwd();

  const packages = await globby('**/kibana.jsonc', {
    cwd,
    absolute: true,
    ignore: [
      '**/node_modules/**',
      '**/target/**',
      '**/build/**',
      '**/dist/**',
      '**/data/**',
      '**/test/**',
      '**/__fixtures__/**',
    ],
  });

  return packages
    .map((p) => {
      const content = readFileSync(p, 'utf8');

      try {
        const manifest = JSON.parse(
          stripJsonComments(content, { trailingCommas: true })
        ) as PackageManifest;

        const id = manifest.id.replace('@kbn/', '');

        const title = `Kibana ${manifest.id
          .replace('@kbn/', '')
          .split('-')
          .map((part: string) => `${part[0].toLocaleUpperCase()}${part.substring(1)}`)
          .join(' ')}`;

        const desc = manifest.description || '';

        const owner =
          typeof manifest.owner === 'string'
            ? manifest.owner.replace('@elastic/', '')
            : manifest.owner?.map((team) => team.replace('@elastic/', '')) || 'unknown';

        const type = manifest.type === 'plugin' ? 'plugin' : 'package';

        const directory = path.dirname(p);

        const folder = `https://github.com/elastic/kibana/tree/main${directory.replace(cwd, '')}`;

        return {
          id,
          title,
          desc,
          owner,
          type,
          folder,
          directory,
        };
      } catch (err) {
        console.warn(`Warning: Failed to parse ${p}, skipping ${err}`);
        return null;
      }
    })
    .sort((a, b) => (a && b ? a.id.localeCompare(b.id) : 0));
}
