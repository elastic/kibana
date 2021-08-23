/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { IndexPattern } from '../../../../data/common';

const memoize = (func: (arg1: string[], arg2: IndexPattern, arg3: boolean) => string[]) => {
  const results: Record<string, string[]> = {};
  return (...args: [string[], IndexPattern, boolean]) => {
    const argsKey = JSON.stringify(args);
    if (!results[argsKey]) {
      results[argsKey] = func(...args);
    }
    return results[argsKey];
  };
};

const getFieldsToShowInner = (
  fields: string[],
  indexPattern: IndexPattern,
  showMultiFields: boolean
) => {
  const childParentFieldsMap = {} as Record<string, string>;
  const mapping = (name: string) => indexPattern.fields.getByName(name);
  fields.forEach((key) => {
    const mapped = mapping(key);
    if (mapped && mapped.spec?.subType?.multi?.parent) {
      childParentFieldsMap[mapped.name] = mapped.spec.subType.multi.parent;
    }
  });
  return fields.filter((key: string) => {
    const fieldMapping = mapping(key);
    const isMultiField = !!fieldMapping?.spec?.subType?.multi;
    if (!isMultiField) {
      return true;
    }
    const parent = childParentFieldsMap[key];
    return showMultiFields || (parent && !fields.includes(parent));
  });
};

export const getFieldsToShow = memoize(getFieldsToShowInner);
