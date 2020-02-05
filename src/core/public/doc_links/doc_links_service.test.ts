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

import { DocLinksService } from './doc_links_service';
import { injectedMetadataServiceMock } from '../injected_metadata/injected_metadata_service.mock';

describe('DocLinksService#start()', () => {
  it('templates the doc links with the branch information from injectedMetadata', () => {
    const injectedMetadata = injectedMetadataServiceMock.createStartContract();
    injectedMetadata.getKibanaBranch.mockReturnValue('test-branch');
    const service = new DocLinksService();
    const start = service.start({ injectedMetadata });
    expect(start.DOC_LINK_VERSION).toEqual('test-branch');
    expect(start.links.kibana).toEqual(
      'https://www.elastic.co/guide/en/kibana/test-branch/index.html'
    );
  });
});
