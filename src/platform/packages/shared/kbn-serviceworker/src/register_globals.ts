/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SERVICEWORKER_FILENAME } from './constants';

const swPublicPathId = 'kbn-serviceworker' as const;

const swBundleDir = (window as any).__kbnPublicPath__?.[swPublicPathId];

export const getServiceWorkerUrl = (buildVersion: string): string => {
  if (!swBundleDir) {
    return '';
  }

  return `${swBundleDir}${SERVICEWORKER_FILENAME}?version=${buildVersion}`;
};
