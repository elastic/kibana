/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getDocLinks, getDocLinksMeta } from '@kbn/doc-links';
import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';

/** @internal */
export interface DocLinksServiceStartDeps {
  injectedMetadata: InternalInjectedMetadataSetup;
}

/** @internal */
export class DocLinksService {
  public setup() {}

  public start({ injectedMetadata }: DocLinksServiceStartDeps): DocLinksStart {
    const kibanaBranch = injectedMetadata.getKibanaBranch();
    const docMeta = getDocLinksMeta({ kibanaBranch });
    const docLinks = getDocLinks({ kibanaBranch });

    return {
      DOC_LINK_VERSION: docMeta.version,
      ELASTIC_WEBSITE_URL: docMeta.elasticWebsiteUrl,
      links: docLinks,
    };
  }
}
