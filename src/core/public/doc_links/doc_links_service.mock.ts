/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { injectedMetadataServiceMock } from '../injected_metadata/injected_metadata_service.mock';
import { DocLinksService, DocLinksStart } from './doc_links_service';

const createStartContractMock = (): DocLinksStart => {
  // This service is so simple that we actually use the real implementation
  const injectedMetadata = injectedMetadataServiceMock.createStartContract();
  injectedMetadata.getKibanaBranch.mockReturnValue('mocked-test-branch');
  return new DocLinksService().start({ injectedMetadata });
};

type DocLinksServiceContract = PublicMethodsOf<DocLinksService>;
const createMock = (): jest.Mocked<DocLinksServiceContract> => ({
  setup: jest.fn().mockReturnValue(undefined),
  start: jest.fn().mockReturnValue(createStartContractMock()),
});

export const docLinksServiceMock = {
  create: createMock,
  createSetupContract: () => jest.fn(),
  createStartContract: createStartContractMock,
};
