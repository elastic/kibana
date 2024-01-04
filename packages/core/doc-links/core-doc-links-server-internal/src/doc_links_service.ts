/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getDocLinks, getDocLinksMeta } from '@kbn/doc-links';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type { DocLinksServiceSetup, DocLinksServiceStart } from '@kbn/core-doc-links-server';

/** @internal */
export class DocLinksService {
  private docLinks?: DocLinksServiceSetup;

  constructor(private readonly coreContext: CoreContext) {}

  public setup(): DocLinksServiceSetup {
    const kibanaBranch = this.coreContext.env.packageInfo.branch;
    const buildFlavor = this.coreContext.env.packageInfo.buildFlavor;

    const docMeta = getDocLinksMeta({ kibanaBranch, buildFlavor });
    const docLinks = getDocLinks({ kibanaBranch, buildFlavor });
    this.docLinks = {
      ...docMeta,
      links: docLinks,
    };
    return this.docLinks;
  }

  public start(): DocLinksServiceStart {
    if (!this.docLinks) {
      throw new Error('#setup must be called before #start');
    }
    return this.docLinks;
  }
}
