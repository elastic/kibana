/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';
import Path from 'path';
import { writeFile, readFile } from 'fs/promises';
import { REPO_ROOT } from '@kbn/repo-info';

const LOCAL_FILE = Path.join(
  REPO_ROOT,
  'packages',
  'kbn-gen-ai-functional-testing',
  'connector_config.json'
);

export const retrieveFromVault = async () => {
  const { stdout } = await execa(
    'vault',
    ['read', '-field=connectors-config', 'secret/ci/elastic-kibana/ai-infra-ci-connectors'],
    {
      cwd: REPO_ROOT,
      buffer: true,
    }
  );

  const config = JSON.parse(Buffer.from(stdout, 'base64').toString('utf-8'));

  await writeFile(LOCAL_FILE, JSON.stringify(config, undefined, 2));

  // eslint-disable-next-line no-console
  console.log(`Config dumped into ${LOCAL_FILE}`);
};

export const formatCurrentConfig = async () => {
  const config = await readFile(LOCAL_FILE, 'utf-8');
  const asB64 = Buffer.from(config).toString('base64');
  // eslint-disable-next-line no-console
  console.log(asB64);
};

export const uploadToVault = async () => {
  const config = await readFile(LOCAL_FILE, 'utf-8');
  const asB64 = Buffer.from(config).toString('base64');

  await execa(
    'vault',
    ['write', 'secret/ci/elastic-kibana/ai-infra-ci-connectors', `connectors-config=${asB64}`],
    {
      cwd: REPO_ROOT,
      buffer: true,
    }
  );
};
