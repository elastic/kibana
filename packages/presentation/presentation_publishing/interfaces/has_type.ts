/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface HasType<T extends string = string> {
  type: T;
}

export interface HasTypeDisplayName {
  getTypeDisplayName: () => string;
  getTypeDisplayNameLowerCase?: () => string;
}

export const apiHasType = (api: unknown | null): api is HasType => {
  return Boolean(api && (api as HasType).type);
};

export const apiIsOfType = <T extends string = string>(
  api: unknown | null,
  typeToCheck: T
): api is HasType<T> => {
  return Boolean(api && (api as HasType).type) && (api as HasType).type === typeToCheck;
};
