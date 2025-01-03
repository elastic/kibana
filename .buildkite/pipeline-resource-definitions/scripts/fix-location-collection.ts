#!/usr/bin/env ts-node-script
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import jsYaml from 'js-yaml';
import path from 'path';
import { execSync } from 'child_process';

const EXCLUDE_LIST = ['locations.yml', '_templates'];
const REPO_FILES_BASE = 'https://github.com/elastic/kibana/blob/main';

type BackstageLocationResource = object & {
  spec: { targets: string[] };
};

async function main() {
  const repoRoot = execSync('git rev-parse --show-toplevel').toString().trim();
  const resourceDefinitionsRoot = path.resolve(
    repoRoot,
    '.buildkite',
    'pipeline-resource-definitions'
  );
  const resourceDefinitionsBaseUrl = `${REPO_FILES_BASE}/.buildkite/pipeline-resource-definitions`;
  const locationFile = path.resolve(resourceDefinitionsRoot, 'locations.yml');
  const locationFileLines = fs.readFileSync(locationFile, 'utf8').split('\n');

  const pipelines = readDirRecursively(resourceDefinitionsRoot)
    .filter((file) => file.endsWith('.yml'))
    .map((file) => file.replace(`${resourceDefinitionsRoot}/`, ''))
    .filter((f) => EXCLUDE_LIST.every((excludeExpr) => !f.match(excludeExpr)));

  const preamble = locationFileLines.slice(0, 1);

  const locationObj = jsYaml.load(
    locationFileLines.slice(1).join('\n')
  ) as BackstageLocationResource;
  locationObj.spec.targets = pipelines.map(
    (fileName) => `${resourceDefinitionsBaseUrl}/${fileName}`
  );

  const locationYaml = jsYaml.dump(locationObj, { lineWidth: 400 });

  fs.writeFileSync(locationFile, `${preamble.join('\n')}\n${locationYaml}`);

  console.log('Updated locations.yml');
}

function readDirRecursively(dir: string): string[] {
  const files = fs.readdirSync(dir);
  return files.reduce((acc, file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      return [...acc, ...readDirRecursively(filePath)];
    } else {
      return [...acc, filePath];
    }
  }, [] as string[]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
