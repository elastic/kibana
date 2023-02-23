/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { GainsightApi } from './types';

/**
 * gainsight basic configuration.
 */
export interface GainsightSnippetConfig {
  /**
   * The gainsight account id.
   */
  gainsightOrgId: string;
  /**
   * The URL to load the gainsight client from. Falls back to `web-sdk.aptrinsic.com` if not specified.
   */
  scriptUrl?: string;
  cssFileEndpoint?: string;
  widgetFileEndpoint?: string;
}
export function loadSnippet({
  gainsightOrgId,
  scriptUrl = 'web-sdk.aptrinsic.com/api/aptrinsic.js',
  cssFileEndpoint = 'web-sdk.aptrinsic.com/style.css',
  widgetFileEndpoint = 'web-sdk.aptrinsic.com/widget/aptrinsic-widget.js ',
}: GainsightSnippetConfig): GainsightApi {
  /* eslint-disable no-var,dot-notation,prefer-rest-params,@typescript-eslint/no-unused-expressions */
  (function (n, t, a, e, co) {
    var i = 'aptrinsic';
    // @ts-expect-error
    (n[i] =
      // @ts-expect-error
      n[i] ||
      function () {
        // @ts-expect-error
        (n[i].q = n[i].q || []).push(arguments);
      }),
      // @ts-expect-error
      (n[i].p = e);
    // @ts-expect-error
    n[i].c = co;
    var r = t.createElement('script');
    (r.async = !1), (r.src = a + '?a=' + e);
    var c = t.getElementsByTagName('script')[0];
    // @ts-expect-error
    c.parentNode.insertBefore(r, c);
  })(window, document, scriptUrl, gainsightOrgId, {
    cssFileEndpoint,
    widgetFileEndpoint,
  });

  const gainsightApi = window['aptrinsic'];

  if (!gainsightApi || !gainsightApi.init) {
    throw new Error('Gainsight snippet failed to load. Check browser logs for more information.');
  }

  return gainsightApi;
}
