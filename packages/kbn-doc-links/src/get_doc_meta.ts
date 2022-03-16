/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DocLinksMeta } from './types';

export interface GetDocLinksMetaOptions {
  kibanaBranch: string;
}

export const getDocLinksMeta = ({ kibanaBranch }: GetDocLinksMetaOptions): DocLinksMeta => {
  return {
    version: kibanaBranch === 'main' ? 'master' : kibanaBranch,
    elasticWebsiteUrl: 'https://www.elastic.co/',
  };
};
