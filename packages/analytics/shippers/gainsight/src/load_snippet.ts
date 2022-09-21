/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { GainSightApi } from './types';

/**
 * gainSight basic configuration.
 */
export interface GainSightSnippetConfig {
  /**
   * The gainSight account id.
   */
  gainSightOrgId: string;
  /**
   * The URL to load the gainSight client from. Falls back to `web-sdk.aptrinsic.com` if not specified.
   */
  scriptUrl?: string;
}
export function loadSnippet({
  gainSightOrgId,
  scriptUrl = 'web-sdk.aptrinsic.com/api/aptrinsic.js',
}: GainSightSnippetConfig): GainSightApi {
  /* eslint-disable no-var,dot-notation,prefer-rest-params,@typescript-eslint/no-unused-expressions */
  (function (n, t, a, e, co) {
    var i = 'aptrinsic';
    // @ts-expect-error
    (n[i] =
      n[i] ||
      function () {
        (n[i].q = n[i].q || []).push(arguments);
      }),
      (n[i].p = e);
    n[i].c = co;
    var r = t.createElement('script');
    (r.async = !0), (r.src = a + '?a=' + e);
    var c = t.getElementsByTagName('script')[0];
    // @ts-expect-error
    c.parentNode.insertBefore(r, c);
  })(window, document, scriptUrl, gainSightOrgId);

  const gainSightApi = window['aptrinsic'];

  if (!gainSightApi) {
    throw new Error('GainSight snippet failed to load. Check browser logs for more information.');
  }

  return gainSightApi;
}
