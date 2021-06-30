/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SharePluginSetup, SharePluginStart } from '.';
import { UrlService } from '../common/url_service';

export type Setup = jest.Mocked<SharePluginSetup>;
export type Start = jest.Mocked<SharePluginStart>;

const url = new UrlService({
  navigate: async () => {},
  getUrl: async ({ app, path }, { absolute }) => {
    return `${absolute ? 'http://localhost:8888' : ''}/app/${app}${path}`;
  },
});

const createSetupContract = (): Setup => {
  const setupContract: Setup = {
    register: jest.fn(),
    urlGenerators: {
      registerUrlGenerator: jest.fn(),
    },
    url,
  };
  return setupContract;
};

const createStartContract = (): Start => {
  const startContract: Start = {
    url,
    urlGenerators: {
      getUrlGenerator: jest.fn(),
    },
    toggleShareContextMenu: jest.fn(),
  };
  return startContract;
};

export const sharePluginMock = {
  createSetupContract,
  createStartContract,
};
