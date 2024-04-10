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
  | 'urlService'
  | 'shareableUrl'
  | 'shareableUrlForSavedObject'
  | 'shareableUrlLocatorParams'
  | 'allowShortUrl'
> & {
  setDashboardLink: (url: string) => void;
  setIsNotSaved: () => void;
  setIsClicked: boolean;
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
  shareableUrl,
  shareableUrlForSavedObject,
  urlService,
  shareableUrlLocatorParams,
  setDashboardLink,
  setIsNotSaved,
  allowShortUrl,
  setIsClicked,
}: LinkProps) => {
  const isMounted = useMountedState();
  const [, setUrl] = useState<string>('');
  const [urlParams] = useState<UrlParams | undefined>(undefined);
  const [shortUrlCache, setShortUrlCache] = useState<string | undefined>(undefined);

  const isNotSaved = useCallback(() => {
    return objectId === undefined || objectId === '' || isDirty;
  }, [objectId, isDirty]);

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
      tempUrl = urlParams ? getUrlParamExtensions(tempUrl) : tempUrl;
      setUrl(tempUrl);
      return tempUrl;
    },
    [getUrlParamExtensions, urlParams]
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
      if (!isMounted || shortUrlCache) return setDashboardLink(shortUrlCache!);
      const shortUrl = shareableUrlLocatorParams
        ? await urlService.shortUrls.get(null).createWithLocator(shareableUrlLocatorParams)
        : (await urlService.shortUrls.get(null).createFromLongUrl(tempUrl)).url;
      setShortUrlCache(shortUrl as string);
      setUrl(shortUrl as string);
      return setDashboardLink(shortUrl as string);
    },
    [setDashboardLink, isMounted, shareableUrlLocatorParams, urlService.shortUrls, shortUrlCache]
  );

  const setUrlHelper = useCallback(() => {
    let tempUrl: string | undefined;

    if (objectType === 'dashboard' || objectType === 'search') {
      tempUrl = getSnapshotUrl();
    } else if ('lens') {
      tempUrl = getSavedObjectUrl();
    }
    return allowShortUrl
      ? createShortUrl(tempUrl!)
      : (setUrl(tempUrl!), setDashboardLink(tempUrl!));
  }, [
    allowShortUrl,
    createShortUrl,
    getSavedObjectUrl,
    getSnapshotUrl,
    objectType,
    setDashboardLink,
  ]);

  useEffect(() => {
    isMounted();
    if (setIsClicked === true) setUrlHelper();
    setIsNotSaved();
  }, [objectType, setIsNotSaved, isDirty, isMounted, setUrlHelper, setIsClicked]);

  const renderSaveState =
    objectType === 'lens' && isNotSaved() ? (
      <FormattedMessage
        id="share.link.lens.saveUrlBox"
        defaultMessage="There are unsaved changes. Before you generate a link, save the {objectType}."
        values={{ objectType }}
      />
    ) : objectType === 'lens' ? (
      shortUrlCache ?? shareableUrl
    ) : (
      shareableUrl ?? shortUrlCache ?? ''
    );

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
      {objectType !== 'dashboard' && (
        <EuiCodeBlock whiteSpace="pre" css={{ paddingRight: '30px' }}>
          {renderSaveState}
        </EuiCodeBlock>
      )}
      <EuiSpacer />
    </EuiForm>
  );
};
