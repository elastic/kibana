/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DefinitionUrlParams } from '@kbn/console-plugin/common/types';
import type { SpecificationTypes } from './types';
import { convertUrlProperties } from './helpers';

export const generateUrlComponents = (
  request: SpecificationTypes.Request,
  schema: SpecificationTypes.Model
): DefinitionUrlParams => {
  let urlComponents: DefinitionUrlParams = {};
  const { path } = request;
  urlComponents = convertUrlProperties(path, urlComponents, schema);
  // remove empty strings and empty arrays
  Object.entries(urlComponents).forEach(([paramName, paramValue]) => {
    if (!paramValue || (paramValue as []).length === 0) {
      delete urlComponents[paramName];
    }
  });
  return urlComponents;
};
