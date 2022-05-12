/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublicMethodsOf } from '@kbn/utility-types';
import { getDocLinks, getDocLinksMeta } from '@kbn/doc-links';
import type { DocLinksServiceStart, DocLinksServiceSetup } from './types';
import type { DocLinksService } from './doc_links_service';

type DocLinksServiceContract = PublicMethodsOf<DocLinksService>;

const createSetupMock = (): DocLinksServiceSetup => {
  const branch = 'test-branch';
  return {
    ...getDocLinksMeta({ kibanaBranch: branch }),
    links: getDocLinks({ kibanaBranch: branch }),
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
