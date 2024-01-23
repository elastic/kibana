/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Env } from '@kbn/config';
import { getDocLinksMeta, getDocLinks } from '@kbn/doc-links';
import { LogRecord } from '@kbn/logging';
import { REPO_ROOT } from '@kbn/repo-info';
import { getEnvOptions } from '@kbn/config-mocks';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import fs from 'fs/promises';
import JSON5 from 'json5';

export const getDocVersion = () => {
  const env = Env.createDefault(REPO_ROOT, getEnvOptions());
  return getDocLinksMeta({
    kibanaBranch: env.packageInfo.branch,
    buildFlavor: env.packageInfo.buildFlavor,
  }).version;
};

export const getMigrationDocLink = () => {
  const env = Env.createDefault(REPO_ROOT, getEnvOptions());
  const docLinks = getDocLinks({
    kibanaBranch: env.packageInfo.branch,
    buildFlavor: env.packageInfo.buildFlavor,
  });
  return docLinks.kibanaUpgradeSavedObjects;
};

export const delay = (seconds: number) =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000));

export const createType = (parts: Partial<SavedObjectsType>): SavedObjectsType => ({
  name: 'test-type',
  hidden: false,
  namespaceType: 'single',
  mappings: { properties: {} },
  ...parts,
});

export const parseLogFile = async (filePath: string): Promise<LogRecord[]> => {
  const logFileContent = await fs.readFile(filePath, 'utf-8');
  return logFileContent
    .split('\n')
    .filter(Boolean)
    .map((str) => JSON5.parse(str)) as LogRecord[];
};
