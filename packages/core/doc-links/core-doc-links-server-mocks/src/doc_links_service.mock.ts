/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DocLinksServiceSetup, DocLinksServiceStart } from '@kbn/core-doc-links-server';
import type { DocLinksService } from '@kbn/core-doc-links-server-internal';
import { getDocLinks, getDocLinksMeta } from '@kbn/doc-links';
import { PublicMethodsOf } from '@kbn/utility-types';

type DocLinksServiceContract = PublicMethodsOf<DocLinksService>;

const createSetupMock = (): DocLinksServiceSetup => {
  const branch = 'test-branch';
  const buildFlavor = 'traditional';
  return {
    ...getDocLinksMeta({ kibanaBranch: branch, buildFlavor }),
    links: getDocLinks({ kibanaBranch: branch, buildFlavor }),
  };
};

const createStartMock = (): DocLinksServiceStart => {
  return createSetupMock();
};

const createServiceMock = (): jest.Mocked<DocLinksServiceContract> => {
  return {
    setup: jest.fn().mockImplementation(createSetupMock),
    start: jest.fn().mockImplementation(createStartMock),
  };
};

export const docLinksServiceMock = {
  create: createServiceMock,
  createSetupContract: createSetupMock,
  createStartContract: createStartMock,
};
