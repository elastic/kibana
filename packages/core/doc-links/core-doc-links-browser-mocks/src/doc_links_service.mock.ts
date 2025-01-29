/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { coreContextMock } from '@kbn/core-base-browser-mocks';
import { injectedMetadataServiceMock } from '@kbn/core-injected-metadata-browser-mocks';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { DocLinksService } from '@kbn/core-doc-links-browser-internal';

const createStartContractMock = (): DocLinksStart => {
  // This service is so simple that we actually use the real implementation
  const injectedMetadata = injectedMetadataServiceMock.createStartContract();
  injectedMetadata.getKibanaBranch.mockReturnValue('mocked-test-branch');
  return new DocLinksService(coreContextMock.create()).start({ injectedMetadata });
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
