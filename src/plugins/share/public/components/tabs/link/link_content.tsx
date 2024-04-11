/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  copyToClipboard,
  EuiButton,
  EuiCodeBlock,
  EuiCopy,
  EuiForm,
  EuiModalFooter,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useState } from 'react';
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
>;

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
  allowShortUrl,
}: LinkProps) => {
  const [url, setUrl] = useState<string>('');
  const [urlParams] = useState<UrlParams | undefined>(undefined);
  const [shortUrlCache, setShortUrlCache] = useState<string | undefined>(undefined);

  const isNotSaved = useCallback(() => {
    return isDirty;
  }, [isDirty]);

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

  const createShortUrl = useCallback(async () => {
    if (shareableUrlLocatorParams) {
      const shortUrls = urlService.shortUrls.get(null);
      const shortUrl = await shortUrls.createWithLocator(shareableUrlLocatorParams);
      const urlWithLoc = await shortUrl.locator.getUrl(shortUrl.params, { absolute: true });
      setShortUrlCache(urlWithLoc);
      return urlWithLoc;
    } else {
      const snapshotUrl = getSnapshotUrl();
      const shortUrl = await urlService.shortUrls.get(null).createFromLongUrl(snapshotUrl);
      setShortUrlCache(shortUrl.url);
      return shortUrl.url;
    }
  }, [shareableUrlLocatorParams, urlService.shortUrls, getSnapshotUrl, setShortUrlCache]);

  const setUrlHelper = useCallback(async () => {
    let tempUrl = '';

    if (objectType === 'dashboard' || objectType === 'search') {
      tempUrl = getSnapshotUrl();
    } else if (objectType === 'lens') {
      tempUrl = getSavedObjectUrl() as string;
    }
    const urlToCopy = allowShortUrl ? await createShortUrl() : tempUrl;
    copyToClipboard(urlToCopy);
    setUrl(urlToCopy);
  }, [allowShortUrl, createShortUrl, getSavedObjectUrl, getSnapshotUrl, objectType, setUrl]);

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
    <>
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
      <EuiModalFooter css={{ padding: 0 }}>
        <EuiCopy textToCopy={url}>
          {() => (
            <EuiButton
              fill
              data-test-subj="copyShareUrlButton"
              color={allowShortUrl ? 'primary' : isNotSaved() ? 'warning' : 'primary'}
              data-share-url={url}
              onClick={() => {
                return url ? copyToClipboard(url) : setUrlHelper();
              }}
            >
              <FormattedMessage id="share.link.copyLinkButton" defaultMessage="Copy link" />
            </EuiButton>
          )}
        </EuiCopy>
      </EuiModalFooter>
    </>
  );
};
