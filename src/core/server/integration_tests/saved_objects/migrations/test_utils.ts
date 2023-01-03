/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Env } from '@kbn/config';
import { getDocLinksMeta, getDocLinks } from '@kbn/doc-links';
import { REPO_ROOT } from '@kbn/repo-info';
import { getEnvOptions } from '@kbn/config-mocks';

export const getDocVersion = () => {
  const env = Env.createDefault(REPO_ROOT, getEnvOptions());
  return getDocLinksMeta({ kibanaBranch: env.packageInfo.branch }).version;
};

export const getMigrationDocLink = () => {
  const env = Env.createDefault(REPO_ROOT, getEnvOptions());
  const docLinks = getDocLinks({ kibanaBranch: env.packageInfo.branch });
  return docLinks.kibanaUpgradeSavedObjects;
};

export const delay = (seconds: number) =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000));
