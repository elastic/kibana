/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaPackageType } from './kibana_manifest';

export const ID_PATTERN = /^[a-z][a-zA-Z_]*$/;

export function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export const isArrOfStrings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((i) => typeof i === 'string');

export const isValidId = (id: string) => ID_PATTERN.test(id);

export const isArrOfIds = (v: unknown): v is string[] => isArrOfStrings(v) && v.every(isValidId);

/**
 * This weird map allows us to ensure that every value in the
 * `KibanaPackageType` union is represented because the mapped
 * type requires that the `PACKAGE_TYPE_MAP` map has a property
 * matching every value in the union.
 */
const PACKAGE_TYPE_MAP: { [k in KibanaPackageType]: true } = {
  'functional-tests': true,
  'plugin-browser': true,
  'plugin-server': true,
  'shared-browser': true,
  'shared-common': true,
  'shared-server': true,
  'test-helper': true,
  'shared-scss': true,
};

export const PACKAGE_TYPES = Object.keys(PACKAGE_TYPE_MAP) as KibanaPackageType[];

export const isValidPkgType = (type: unknown): type is keyof typeof PACKAGE_TYPE_MAP =>
  typeof type === 'string' && Object.hasOwn(PACKAGE_TYPE_MAP, type);
