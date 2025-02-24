/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
    version: kibanaBranch === 'main' ? 'current' : kibanaBranch,
    ecs_version: 'current',
    elasticWebsiteUrl: 'https://www.elastic.co/',
    elasticGithubUrl: 'https://github.com/elastic/',
    docsWebsiteUrl: 'https://docs.elastic.co/',
    searchLabsUrl: 'https://search-labs.elastic.co/',
  };
};
