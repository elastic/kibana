/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializableRecord } from '@kbn/utility-types';
import { SharePluginSetup, SharePluginStart } from '.';
import { LocatorPublic, UrlService } from '../common/url_service';

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
    navigate: jest.fn(),
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
    navigate: jest.fn(),
  };
  return startContract;
};

const createLocator = <T extends SerializableRecord = SerializableRecord>(): jest.Mocked<
  LocatorPublic<T>
> => ({
  getLocation: jest.fn(),
  getUrl: jest.fn(),
  useUrl: jest.fn(),
  navigate: jest.fn(),
  extract: jest.fn(),
  inject: jest.fn(),
  telemetry: jest.fn(),
  migrations: {},
});

export const sharePluginMock = {
  createSetupContract,
  createStartContract,
  createLocator,
};

export * from '../common/mocks';
