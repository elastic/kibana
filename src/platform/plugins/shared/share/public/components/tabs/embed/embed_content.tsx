/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiFlexItem,
  EuiSwitch,
  type EuiSwitchEvent,
  EuiToolTip,
  EuiIcon,
  copyToClipboard,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { format as formatUrl, parse as parseUrl } from 'url';
import { AnonymousAccessState } from '../../../../common';

import type { IShareContext, ShareContextObjectTypeConfig } from '../../context';

type EmbedProps = Pick<
  IShareContext,
  | 'shareableUrlLocatorParams'
  | 'shareableUrlForSavedObject'
  | 'shareableUrl'
  | 'embedUrlParamExtensions'
  | 'objectType'
  | 'isDirty'
  | 'allowShortUrl'
  | 'anonymousAccess'
  | 'urlService'
> & {
  objectConfig?: ShareContextObjectTypeConfig;
};

interface UrlParams {
  [extensionName: string]: {
    [queryParam: string]: boolean;
  };
}

export const EmbedContent = ({
  embedUrlParamExtensions: urlParamExtensions,
  shareableUrlForSavedObject,
  shareableUrl,
  shareableUrlLocatorParams,
  objectType,
  objectConfig = {},
  isDirty,
  allowShortUrl,
  urlService,
  anonymousAccess,
}: EmbedProps) => {
  const urlParamsRef = useRef<UrlParams | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState<string>('');
  const [isTextCopied, setTextCopied] = useState(false);
  const urlToCopy = useRef<string | undefined>(undefined);
  const [anonymousAccessParameters, setAnonymousAccessParameters] =
    useState<AnonymousAccessState['accessURLParameters']>(null);
  const [usePublicUrl, setUsePublicUrl] = useState<boolean>(false);
  const [showPublicUrlSwitch, setShowPublicUrlSwitch] = useState(false);
  const copiedTextToolTipCleanupIdRef = useRef<ReturnType<typeof setTimeout>>();

  const { draftModeCallOut: DraftModeCallout, computeAnonymousCapabilities } = objectConfig;

  useEffect(() => {
    if (computeAnonymousCapabilities && anonymousAccess) {
      const resolveAnonymousAccessClaims = async () => {
        try {
          const [state, capabilities] = await Promise.all([
            anonymousAccess.getState(),
            anonymousAccess.getCapabilities(),
          ]);

          if (state?.isEnabled) {
            setAnonymousAccessParameters(state?.accessURLParameters);

            if (capabilities) {
              setShowPublicUrlSwitch(computeAnonymousCapabilities?.(capabilities));
            }
          }
        } catch {
          //
        }
      };

      resolveAnonymousAccessClaims();
    }
  }, [anonymousAccess, computeAnonymousCapabilities]);

  const makeUrlEmbeddable = useCallback((tempUrl: string): string => {
    const embedParam = '?embed=true';
    const urlHasQueryString = tempUrl.indexOf('?') !== -1;

    if (urlHasQueryString) {
      return tempUrl.replace('?', `${embedParam}&`);
    }

    return `${tempUrl}${embedParam}`;
  }, []);

  const getUrlParamExtensions = useCallback((tempUrl: string): string => {
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

  const updateUrlParams = useCallback(
    (url: string) => getUrlParamExtensions(makeUrlEmbeddable(url)),
    [makeUrlEmbeddable, getUrlParamExtensions]
  );

  useEffect(
    () => setSnapshotUrl(updateUrlParams(shareableUrl || window.location.href)),
    [shareableUrl, updateUrlParams]
  );

  const getSavedObjectUrl = useCallback(() => {
    const tempUrl = shareableUrlForSavedObject
      ? updateUrlParams(shareableUrlForSavedObject)
      : snapshotUrl;

    const parsedUrl = parseUrl(tempUrl);

    if (!parsedUrl || !parsedUrl.hash) {
      return tempUrl;
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
  }, [shareableUrlForSavedObject, snapshotUrl, updateUrlParams]);

  const createShortUrl = useCallback(async () => {
    const shortUrlService = urlService.shortUrls.get(null);

    if (shareableUrlLocatorParams) {
      const shortUrl = await shortUrlService.createWithLocator(shareableUrlLocatorParams);
      return shortUrl.locator.getUrl(shortUrl.params, { absolute: true });
    } else {
      return (await shortUrlService.createFromLongUrl(snapshotUrl)).url;
    }
  }, [shareableUrlLocatorParams, snapshotUrl, urlService.shortUrls]);

  const addUrlAnonymousAccessParameters = useCallback(
    (tempUrl: string): string => {
      if (!anonymousAccessParameters || !usePublicUrl) {
        return tempUrl;
      }

      const parsedUrl = new URL(tempUrl);

      for (const [name, value] of Object.entries(anonymousAccessParameters)) {
        parsedUrl.searchParams.set(name, value);
      }

      return parsedUrl.toString();
    },
    [anonymousAccessParameters, usePublicUrl]
  );

  const getEmbedLink = useCallback(async () => {
    const embedUrl = addUrlAnonymousAccessParameters(
      !isDirty ? getSavedObjectUrl() : allowShortUrl ? await createShortUrl() : snapshotUrl
    );

    return `<iframe src="${embedUrl}" height="600" width="800"></iframe>`;
  }, [
    addUrlAnonymousAccessParameters,
    allowShortUrl,
    createShortUrl,
    getSavedObjectUrl,
    isDirty,
    snapshotUrl,
  ]);

  const copyUrlHelper = useCallback(async () => {
    setIsLoading(true);

    urlToCopy.current = await getEmbedLink();

    copyToClipboard(urlToCopy.current!);
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
  }, [getEmbedLink]);

  const renderUrlParamExtensions = () => {
    if (!urlParamExtensions) {
      return null;
    }

    const setParamValue =
      (paramName: string) =>
      (values: { [queryParam: string]: boolean } = {}): void => {
        urlParamsRef.current = { ...urlParamsRef.current, [paramName]: { ...values } };
      };

    return (
      <React.Fragment>
        {urlParamExtensions.map(({ paramName, component: UrlParamComponent }) => (
          <EuiFormRow key={paramName}>
            <UrlParamComponent setParamValue={setParamValue(paramName)} />
          </EuiFormRow>
        ))}
      </React.Fragment>
    );
  };

  const renderPublicUrlOptionsSwitch = () => {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={
              <FormattedMessage
                id="share.embed.publicUrlOptionsSwitch.label"
                defaultMessage="Allow public access"
              />
            }
            checked={usePublicUrl}
            onChange={(e: EuiSwitchEvent) => setUsePublicUrl(e.target.checked)}
            data-test-subj="embedPublicUrlOptionsSwitch"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={
              <FormattedMessage
                id="share.embed.publicUrlOptionsSwitch.tooltip"
                defaultMessage="Enabling public access generates a sharable URL that allows anonymous access without a login prompt."
              />
            }
          >
            <EuiIcon type="questionInCircle" />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  const helpText =
    objectType === 'dashboard' ? (
      <FormattedMessage
        id="share.embed.dashboard.helpText"
        defaultMessage="Embed this dashboard into another webpage. Select which items to include in the embeddable view."
      />
    ) : (
      <FormattedMessage
        id="share.embed.helpText"
        defaultMessage="Embed this {objectType} into another webpage."
        values={{ objectType }}
      />
    );

  return (
    <>
      <EuiForm>
        <EuiText size="s">{helpText}</EuiText>
        <EuiSpacer />
        {renderUrlParamExtensions()}
        {isDirty && DraftModeCallout && (
          <>
            <EuiSpacer size="m" />
            {DraftModeCallout}
          </>
        )}
        <EuiSpacer />
      </EuiForm>
      <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
        <React.Fragment>
          {showPublicUrlSwitch ? renderPublicUrlOptionsSwitch() : null}
        </React.Fragment>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={
              isTextCopied
                ? i18n.translate('share.embed.copied', { defaultMessage: 'Link copied' })
                : null
            }
          >
            <EuiButton
              fill
              data-test-subj="copyEmbedUrlButton"
              onClick={copyUrlHelper}
              data-share-url={urlToCopy.current}
              isLoading={isLoading}
            >
              <FormattedMessage
                id="share.embed.copyEmbedCodeButton"
                defaultMessage="Copy embed code"
              />
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
