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
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useState, useRef, useEffect } from 'react';
import type { IShareContext, ShareContextObjectTypeConfig } from '../../context';

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
> & { objectConfig?: ShareContextObjectTypeConfig };

interface UrlParams {
  [extensionName: string]: {
    [queryParam: string]: boolean;
  };
}

export const LinkContent = ({
  isDirty,
  objectType,
  objectConfig = {},
  shareableUrl,
  urlService,
  shareableUrlLocatorParams,
  allowShortUrl,
  delegatedShareUrlHandler,
}: LinkProps) => {
  const [snapshotUrl, setSnapshotUrl] = useState<string>('');
  const [isTextCopied, setTextCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const urlParamsRef = useRef<UrlParams | undefined>(undefined);
  const urlToCopy = useRef<string | undefined>(undefined);
  const copiedTextToolTipCleanupIdRef = useRef<ReturnType<typeof setTimeout>>();

  const getUrlWithUpdatedParams = useCallback((tempUrl: string): string => {
    const urlWithUpdatedParams = urlParamsRef.current
      ? Object.keys(urlParamsRef.current).reduce((urlAccumulator, key) => {
          const urlParam = urlParamsRef.current?.[key];
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

    return urlWithUpdatedParams;
  }, []);

  useEffect(() => {
    setSnapshotUrl(getUrlWithUpdatedParams(shareableUrl || window.location.href));
  }, [getUrlWithUpdatedParams, shareableUrl]);

  const createShortUrl = useCallback(async () => {
    const shortUrlService = urlService.shortUrls.get(null);

    if (shareableUrlLocatorParams) {
      const shortUrl = await shortUrlService.createWithLocator(shareableUrlLocatorParams);
      return shortUrl.locator.getUrl(shortUrl.params, { absolute: true });
    } else {
      return (await shortUrlService.createFromLongUrl(snapshotUrl)).url;
    }
  }, [shareableUrlLocatorParams, urlService.shortUrls, snapshotUrl]);

  const copyUrlHelper = useCallback(async () => {
    setIsLoading(true);

    if (!urlToCopy.current) {
      urlToCopy.current = delegatedShareUrlHandler
        ? delegatedShareUrlHandler()
        : allowShortUrl
        ? await createShortUrl()
        : snapshotUrl;
    }

    copyToClipboard(urlToCopy.current);
    setTextCopied(() => {
      if (copiedTextToolTipCleanupIdRef.current) {
        clearTimeout(copiedTextToolTipCleanupIdRef.current);
      }

      // set up timer to revert copied state to false after specified duration
      copiedTextToolTipCleanupIdRef.current = setTimeout(() => setTextCopied(false), 1000);

      // set copied state to true for now
      return true;
    });
    setIsLoading(false);
  }, [snapshotUrl, delegatedShareUrlHandler, allowShortUrl, createShortUrl]);

  const { draftModeCallOut: DraftModeCallout } = objectConfig;

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
        {isDirty && DraftModeCallout && (
          <>
            <EuiSpacer size="m" />
            {DraftModeCallout}
          </>
        )}
        <EuiSpacer size="l" />
      </EuiForm>
      <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={
              isTextCopied
                ? i18n.translate('share.link.copied', { defaultMessage: 'Link copied' })
                : null
            }
          >
            <EuiButton
              fill
              data-test-subj="copyShareUrlButton"
              data-share-url={urlToCopy.current}
              onBlur={() => (objectType === 'lens' && isDirty ? null : setTextCopied(false))}
              onClick={copyUrlHelper}
              color={objectType === 'lens' && isDirty ? 'warning' : 'primary'}
              isLoading={isLoading}
            >
              <FormattedMessage id="share.link.copyLinkButton" defaultMessage="Copy link" />
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
