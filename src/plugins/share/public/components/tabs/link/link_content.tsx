/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  copyToClipboard,
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo, useState } from 'react';
import { IShareContext } from '../../context';

type LinkProps = Pick<
  IShareContext,
  | 'objectType'
  | 'objectId'
  | 'isDirty'
  | 'urlService'
  | 'shareableUrl'
  | 'delegatedShareUrlHandler'
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
  isDirty,
  shareableUrl,
  urlService,
  shareableUrlLocatorParams,
  allowShortUrl,
  delegatedShareUrlHandler,
}: LinkProps) => {
  const [url, setUrl] = useState<string>('');
  const [urlParams] = useState<UrlParams | undefined>(undefined);
  const [isTextCopied, setTextCopied] = useState(false);
  const [shortUrlCache, setShortUrlCache] = useState<string | undefined>(undefined);

  const getUrlWithUpdatedParams = useCallback(
    (tempUrl: string): string => {
      const urlWithUpdatedParams = urlParams
        ? Object.keys(urlParams).reduce((urlAccumulator, key) => {
            const urlParam = urlParams[key];
            return urlParam
              ? Object.keys(urlParam).reduce((queryAccumulator, queryParam) => {
                  const isQueryParamEnabled = urlParam[queryParam];
                  return isQueryParamEnabled
                    ? queryAccumulator + `&${queryParam}=true`
                    : queryAccumulator;
                }, urlAccumulator)
              : urlAccumulator;
          }, tempUrl)
        : tempUrl;

      // persist updated url to state
      setUrl(urlWithUpdatedParams);
      return urlWithUpdatedParams;
    },
    [urlParams]
  );

  const getSnapshotUrl = useCallback(() => {
    return getUrlWithUpdatedParams(shareableUrl || window.location.href);
  }, [getUrlWithUpdatedParams, shareableUrl]);

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

  const copyUrlHelper = useCallback(async () => {
    let urlToCopy = url;

    if (!urlToCopy || delegatedShareUrlHandler) {
      urlToCopy = delegatedShareUrlHandler
        ? delegatedShareUrlHandler?.()
        : allowShortUrl
        ? await createShortUrl()
        : getSnapshotUrl();
    }

    copyToClipboard(urlToCopy);
    setUrl(urlToCopy);
    setTextCopied(true);
    return urlToCopy;
  }, [url, delegatedShareUrlHandler, allowShortUrl, createShortUrl, getSnapshotUrl]);

  const handleTestUrl = useMemo(() => {
    if (objectType !== 'search' || !allowShortUrl) return getSnapshotUrl();
    else if (objectType === 'search' && allowShortUrl) return shortUrlCache;
    return copyUrlHelper();
  }, [objectType, getSnapshotUrl, allowShortUrl, shortUrlCache, copyUrlHelper]);
  return (
    <>
      <EuiForm>
        <EuiText size="s">
          <FormattedMessage
            id="share.link.helpText"
            defaultMessage="Share a direct link to this {objectType}."
            values={{ objectType }}
          />
        </EuiText>
        {isDirty && objectType === 'lens' && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              color="warning"
              title={
                <FormattedMessage id="share.link.warning.title" defaultMessage="Unsaved changes" />
              }
            >
              <FormattedMessage
                id="share.link.warning.lens"
                defaultMessage="Copy the link to get a temporary link. Save the lens visualization to create a permanent link."
              />
            </EuiCallOut>
          </>
        )}
        <EuiSpacer size="l" />
      </EuiForm>
      <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={
              isTextCopied
                ? i18n.translate('share.link.copied', { defaultMessage: 'Text copied' })
                : null
            }
          >
            <EuiButton
              fill
              data-test-subj="copyShareUrlButton"
              data-share-url={handleTestUrl}
              onBlur={() => (objectType === 'lens' && isDirty ? null : setTextCopied(false))}
              onClick={copyUrlHelper}
              color={objectType === 'lens' && isDirty ? 'warning' : 'primary'}
            >
              <FormattedMessage id="share.link.copyLinkButton" defaultMessage="Copy link" />
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
