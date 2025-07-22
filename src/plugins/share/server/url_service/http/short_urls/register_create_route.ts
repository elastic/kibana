/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { HttpServiceSetup, IRouter } from 'kibana/server';
import { ServerUrlService } from '../../types';

/**
 * Determine if url is outside of this Kibana install.
 * Copied from x-pack/plugins/security/common/is_internal_url.ts
 */
function isInternalURL(url: string, basePath = '') {
  // We use the WHATWG parser TWICE with completely different dummy base URLs to ensure that the parsed URL always
  // inherits the origin of the base URL. This means that the specified URL isn't an absolute URL, or a scheme-relative
  // URL (//), or a scheme-relative URL with an empty host (///). Browsers may process such URLs unexpectedly due to
  // backward compatibility reasons (e.g., a browser may treat `///abc.com` as just `abc.com`). For more details, refer
  // to https://url.spec.whatwg.org/#concept-basic-url-parser and https://url.spec.whatwg.org/#url-representation.
  let normalizedURL: URL;
  try {
    for (const baseURL of ['http://example.org:5601', 'https://example.com']) {
      normalizedURL = new URL(url, baseURL);
      if (normalizedURL.origin !== baseURL) {
        return false;
      }
    }
  } catch {
    return false;
  }

  // Now we need to normalize URL to make sure any relative path segments (`..`) cannot escape expected base path.
  if (basePath) {
    return (
      // Normalized pathname can add a leading slash, but we should also make sure it's included in
      // the original URL too. We can safely use non-null assertion operator here since we know `normalizedURL` is
      // always defined, otherwise we would have returned `false` already.
      url.startsWith('/') &&
      (normalizedURL!.pathname === basePath || normalizedURL!.pathname.startsWith(`${basePath}/`))
    );
  }

  return true;
}

export const registerCreateRoute = (
  router: IRouter,
  url: ServerUrlService,
  http: HttpServiceSetup
) => {
  router.post(
    {
      path: '/api/short_url',
      validate: {
        body: schema.object({
          locatorId: schema.string({
            minLength: 1,
            maxLength: 255,
          }),
          slug: schema.string({
            defaultValue: '',
            minLength: 3,
            maxLength: 255,
          }),
          /**
           * @deprecated
           *
           * This field is deprecated as the API does not support automatic
           * human-readable slug generation.
           *
           * @todo This field will be removed in a future version. It is left
           * here for backwards compatibility.
           */
          humanReadableSlug: schema.boolean({
            defaultValue: false,
          }),
          params: schema.object({}, { unknowns: 'allow' }),
        }),
      },
    },
    router.handleLegacyErrors(async (ctx, req, res) => {
      const { core } = ctx;
      const { locatorId, params, slug } = req.body;
      const locator = url.locators.get(locatorId);

      if (!locator) {
        return res.customError({
          statusCode: 409,
          headers: {
            'content-type': 'application/json',
          },
          body: 'Locator not found.',
        });
      }

      const urlFromParams = (params as { url: string | undefined }).url;
      if (urlFromParams && !isInternalURL(urlFromParams)) {
        return res.customError({
          statusCode: 400,
          body: 'Can not create a short URL for an external URL.',
        });
      }
      const savedObjects = core.savedObjects.client;
      const shortUrls = url.shortUrls.get({ savedObjects });

      const shortUrl = await shortUrls.create({
        locator,
        params,
        slug,
      });

      return res.ok({
        headers: {
          'content-type': 'application/json',
        },
        body: shortUrl.data,
      });
    })
  );
};
