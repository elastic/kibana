/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiCodeBlock, EuiForm, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { format as formatUrl, parse as parseUrl } from 'url';
import { IShareContext } from '../../context';

type LinkProps = Pick<
  IShareContext,
  | 'objectType'
  | 'objectId'
  | 'isDirty'
  | 'isEmbedded'
  | 'urlService'
  | 'shareableUrl'
  | 'shareableUrlForSavedObject'
  | 'shareableUrlLocatorParams'
> & {
  setDashboardLink: (url: string) => void;
};

interface UrlParams {
  [extensionName: string]: {
    [queryParam: string]: boolean;
  };
}

export const LinkContent = ({
  objectType,
  objectId,
  isDirty,
  isEmbedded,
  shareableUrl,
  shareableUrlForSavedObject,
  urlService,
  shareableUrlLocatorParams,
  setDashboardLink,
}: LinkProps) => {
  const isMounted = useMountedState();
  const [url, setUrl] = useState<string>('');
  const [urlParams] = useState<UrlParams | undefined>(undefined);
  const [shortUrlCache, setShortUrlCache] = useState<string | undefined>(undefined);

  useEffect(() => {
    // propagate url updates upwards to tab
    setDashboardLink(url);
  }, [setDashboardLink, url]);

  const isNotSaved = useCallback(() => {
    return objectId === undefined || objectId === '' || isDirty;
  }, [objectId, isDirty]);

  const makeUrlEmbeddable = useCallback((tempUrl: string): string => {
    const embedParam = '?embed=true';
    const urlHasQueryString = tempUrl.indexOf('?') !== -1;

    if (urlHasQueryString) {
      return tempUrl.replace('?', `${embedParam}&`);
    }

    return `${tempUrl}${embedParam}`;
  }, []);

  const getUrlParamExtensions = useCallback(
    (tempUrl: string): string => {
      if (!urlParams) return tempUrl;

      return Object.keys(urlParams).reduce((urlAccumulator, key) => {
        const urlParam = urlParams[key];
        return urlParam
          ? Object.keys(urlParam).reduce((queryAccumulator, queryParam) => {
              const isQueryParamEnabled = urlParam[queryParam];
              return isQueryParamEnabled
                ? queryAccumulator + `&${queryParam}=true`
                : queryAccumulator;
            }, urlAccumulator)
          : urlAccumulator;
      }, tempUrl);
    },
    [urlParams]
  );

  const updateUrlParams = useCallback(
    (tempUrl: string) => {
      tempUrl = isEmbedded ? makeUrlEmbeddable(tempUrl) : tempUrl;
      tempUrl = urlParams ? getUrlParamExtensions(tempUrl) : tempUrl;
      setUrl(tempUrl);
      return tempUrl;
    },
    [makeUrlEmbeddable, getUrlParamExtensions, urlParams, isEmbedded]
  );

  const getSnapshotUrl = useCallback(
    (forSavedObject?: boolean) => {
      let tempUrl = '';
      if (forSavedObject && shareableUrlForSavedObject) {
        tempUrl = shareableUrlForSavedObject;
      }
      if (!tempUrl) {
        tempUrl = shareableUrl || window.location.href;
      }

      return updateUrlParams(tempUrl);
    },
    [shareableUrl, shareableUrlForSavedObject, updateUrlParams]
  );

  const getSavedObjectUrl = useCallback(() => {
    if (isNotSaved()) {
      return;
    }

    const tempUrl = getSnapshotUrl(true);

    const parsedUrl = parseUrl(tempUrl);
    if (!parsedUrl || !parsedUrl.hash) {
      return;
    }

    // Get the application route, after the hash, and remove the #.
    const parsedAppUrl = parseUrl(parsedUrl.hash.slice(1), true);

    const formattedUrl = formatUrl({
      protocol: parsedUrl.protocol,
      auth: parsedUrl.auth,
      host: parsedUrl.host,
      pathname: parsedUrl.pathname,
      hash: formatUrl({
        pathname: parsedAppUrl.pathname,
        query: {
          // Add global state to the URL so that the iframe doesn't just show the time range
          // default.
          _g: parsedAppUrl.query._g,
        },
      }),
    });
    return updateUrlParams(formattedUrl);
  }, [getSnapshotUrl, isNotSaved, updateUrlParams]);

  const createShortUrl = useCallback(
    async (tempUrl: string) => {
      if (!isMounted) return;
      const shortUrl = shareableUrlLocatorParams
        ? await urlService.shortUrls.get(null).createWithLocator(shareableUrlLocatorParams)
        : (await urlService.shortUrls.get(null).createFromLongUrl(tempUrl)).url;
      setShortUrlCache(shortUrl as string);
      setUrl(shortUrl as string);
    },
    [isMounted, shareableUrlLocatorParams, urlService.shortUrls]
  );

  const setUrlHelper = useCallback(() => {
    let tempUrl: string | undefined;

    if (objectType === 'dashboard' || objectType === 'search') {
      tempUrl = getSnapshotUrl();
    } else {
      tempUrl = getSavedObjectUrl();
    }
    return url === '' ? setUrl(tempUrl!) : createShortUrl(tempUrl!);
  }, [getSavedObjectUrl, getSnapshotUrl, createShortUrl, objectType, url]);

  useEffect(() => {
    isMounted();
    setUrlHelper();
  }, [isMounted, setUrlHelper]);

  return (
    <EuiForm>
      <EuiSpacer size="m" />
      <EuiText size="s">
        <FormattedMessage
          id="share.link.helpText"
          defaultMessage="Share a direct link to this {objectType}."
          values={{ objectType }}
        />
      </EuiText>
      <EuiSpacer size="l" />
      <EuiCodeBlock whiteSpace="pre" css={{ paddingRight: '30px' }}>
        {shareableUrl ?? url}
      </EuiCodeBlock>
      <EuiSpacer />
    </EuiForm>
  );
};
