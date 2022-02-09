/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getDocLinks, getDocLinksMeta } from '@kbn/doc-links';
import type { DocLinks } from '@kbn/doc-links';
import { InjectedMetadataSetup } from '../injected_metadata';

export interface StartDeps {
  injectedMetadata: InjectedMetadataSetup;
}

/** @internal */
export class DocLinksService {
  public setup() {}

  public start({ injectedMetadata }: StartDeps): DocLinksStart {
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

/** @public */
export interface DocLinksStart {
  readonly DOC_LINK_VERSION: string;
  readonly ELASTIC_WEBSITE_URL: string;
  readonly links: DocLinks;
}
