/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LinkFactory } from '../types';

export interface LinkTypeRegistry {
  [key: string]: LinkFactory;
}

const linkFactoriesMap: LinkTypeRegistry = {};

export const linksService = {
  registerLinkType: (factory: LinkFactory) => {
    linkFactoriesMap[factory.type] = factory;
  },
  getLinkFactory: (type: string) => {
    return linkFactoriesMap[type];
  },
  getLinkTypes: () => Object.keys(linkFactoriesMap),
};
