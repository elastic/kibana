/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DocLinksService } from './doc_links_service';
import { injectedMetadataServiceMock } from '../injected_metadata/injected_metadata_service.mock';

describe('DocLinksService#start()', () => {
  it('templates the doc links with the branch information from injectedMetadata', () => {
    const injectedMetadata = injectedMetadataServiceMock.createStartContract();
    injectedMetadata.getKibanaBranch.mockReturnValue('test-branch');
    const service = new DocLinksService();
    const api = service.start({ injectedMetadata });
    expect(api.DOC_LINK_VERSION).toEqual('test-branch');
    expect(api.links.kibana).toEqual(
      'https://www.elastic.co/guide/en/kibana/test-branch/index.html'
    );
  });
});
