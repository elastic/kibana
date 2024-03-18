/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DocLinksMeta, BuildFlavor } from './types';

export interface GetDocLinksMetaOptions {
  kibanaBranch: string;
  buildFlavor: BuildFlavor;
}

export const getDocLinksMeta = ({
  kibanaBranch,
  buildFlavor,
}: GetDocLinksMetaOptions): DocLinksMeta => {
  return {
    version: kibanaBranch === 'main' ? 'master' : kibanaBranch,
    elasticWebsiteUrl: 'https://www.elastic.co/',
    elasticGithubUrl: 'https://github.com/elastic/',
    docsWebsiteUrl: 'https://docs.elastic.co/',
    searchLabsUrl: 'https://search-labs.elastic.co/',
  };
};
