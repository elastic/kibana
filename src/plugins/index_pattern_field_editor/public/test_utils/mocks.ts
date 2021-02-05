/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DocLinksStart } from 'src/core/public';

export const noop = () => {};

export const docLinks: DocLinksStart = {
  ELASTIC_WEBSITE_URL: 'htts://jestTest.elastic.co',
  DOC_LINK_VERSION: 'jest',
  links: {} as any,
};

// TODO check how we can better stub an index pattern format
export const fieldFormats = {
  getDefaultInstance: () => ({
    convert: (val: any) => val,
  }),
} as any;
