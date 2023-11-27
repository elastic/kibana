/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

interface Args {
  basePath: string;
  appPath: string;
  spaceId?: string;
}

export const buildKibanaPath = ({ basePath, appPath, spaceId }: Args) => {
  return spaceId === undefined || spaceId.toLowerCase() === 'default'
    ? `${basePath}${appPath}`
    : `${basePath}/s/${spaceId}${appPath}`;
};

export const CATEGORIZE_FIELD_VALUE_TRIGGER = 'CATEGORIZE_FIELD_VALUE_TRIGGER';
export const categorizeFieldValueTrigger: Trigger = {
  id: CATEGORIZE_FIELD_VALUE_TRIGGER,
  title: 'Run pattern analysis',
  description: 'Triggered when user wants to run pattern analysis on a field.',
};
