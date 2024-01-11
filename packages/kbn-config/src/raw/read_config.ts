/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { readFileSync } from 'fs';
import { safeLoad } from 'js-yaml';

import { set } from '@kbn/safer-lodash-set';
import { isPlainObject } from 'lodash';
import { ensureDeepObject } from '@kbn/std';

const readYaml = (path: string) => safeLoad(readFileSync(path, 'utf8'));

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
  if (isPlainObject(value) && Object.keys(value).length > 0) {
    for (const [subKey, subVal] of Object.entries(value)) {
      merge(target, subVal, key ? `${key}.${subKey}` : subKey);
    }
  } else if (key !== undefined) {
    set(target, key, recursiveReplaceEnvVar(value));
  }

  return target;
}

function recursiveReplaceEnvVar(value: any) {
  if (isPlainObject(value) || Array.isArray(value)) {
    for (const [subKey, subVal] of Object.entries(value)) {
      set(value, subKey, recursiveReplaceEnvVar(subVal));
    }
  }
  if (typeof value === 'string') {
    return replaceEnvVarRefs(value);
  }
  return value;
}

/** @internal */
export const getConfigFromFiles = (configFiles: readonly string[]) => {
  let mergedYaml = {};

  for (const configFile of configFiles) {
    const yaml = readYaml(configFile);
    if (yaml !== null) {
      mergedYaml = merge(mergedYaml, yaml);
    }
  }

  return ensureDeepObject(mergedYaml);
};
