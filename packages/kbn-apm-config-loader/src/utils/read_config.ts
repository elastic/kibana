/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { readFileSync } from 'fs';
import { safeLoad } from 'js-yaml';

import { set } from '@elastic/safer-lodash-set';
import { isPlainObject } from 'lodash';
import { ensureDeepObject } from './ensure_deep_object';

const readYaml = (path: string) => {
  try {
    return safeLoad(readFileSync(path, 'utf8'));
  } catch (e) {
    /* tslint:disable:no-empty */
  }
};

function replaceEnvVarRefs(val: string) {
  return val.replace(/\$\{(\w+)\}/g, (match, envVarName) => {
    const envVarValue = process.env[envVarName];
    if (envVarValue !== undefined) {
      return envVarValue;
    }

    throw new Error(`Unknown environment variable referenced in config : ${envVarName}`);
  });
}

function merge(target: Record<string, any>, value: any, key?: string) {
  if ((isPlainObject(value) || Array.isArray(value)) && Object.keys(value).length > 0) {
    for (const [subKey, subVal] of Object.entries(value)) {
      merge(target, subVal, key ? `${key}.${subKey}` : subKey);
    }
  } else if (key !== undefined) {
    set(target, key, typeof value === 'string' ? replaceEnvVarRefs(value) : value);
  }

  return target;
}

/** @internal */
export const getConfigFromFiles = (configFiles: readonly string[]): Record<string, any> => {
  let mergedYaml: Record<string, any> = {};

  for (const configFile of configFiles) {
    const yaml = readYaml(configFile);
    if (yaml !== null) {
      mergedYaml = merge(mergedYaml, yaml);
    }
  }

  return ensureDeepObject(mergedYaml);
};
