/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getDocLinks, getDocLinksMeta } from '@kbn/doc-links';
import type { CoreContext } from '../core_context';
import type { DocLinksServiceSetup, DocLinksServiceStart } from './types';

/** @internal */
export class DocLinksService {
  private readonly kibanaBranch: string;
  private docLinks?: DocLinksServiceSetup;

  constructor(core: CoreContext) {
    this.kibanaBranch = core.env.packageInfo.branch;
  }

  public setup(): DocLinksServiceSetup {
    const docMeta = getDocLinksMeta({ kibanaBranch: this.kibanaBranch });
    const docLinks = getDocLinks({ kibanaBranch: this.kibanaBranch });
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
