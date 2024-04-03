/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { InternalStaticAssets } from './types';

export class StaticAssets implements InternalStaticAssets {
  public readonly assetsHrefBase: string;

  constructor({ assetsHrefBase }: { assetsHrefBase: string }) {
    this.assetsHrefBase = assetsHrefBase.endsWith('/')
      ? assetsHrefBase.slice(0, -1)
      : assetsHrefBase;
  }

  getPluginAssetHref(pluginName: string, assetPath: string): string {
    if (assetPath.startsWith('/')) {
      assetPath = assetPath.slice(1);
    }
    return `${this.assetsHrefBase}/plugins/${pluginName}/assets/${assetPath}`;
  }
}
