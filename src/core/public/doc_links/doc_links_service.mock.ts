/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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
