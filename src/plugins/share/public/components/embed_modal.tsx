/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiCopy,
  EuiForm,
  EuiFormHelpText,
  EuiFormRow,
  EuiModalFooter,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { format as formatUrl, parse as parseUrl } from 'url';
import { AnonymousAccessState, LocatorPublic } from '../../common';
import { BrowserUrlService, UrlParamExtension } from '../types';

interface EmbedProps {
  urlParamExtensions?: UrlParamExtension[];
  shareableUrlLocatorParams?:
    | {
        locator: LocatorPublic<any>;
        params: any;
      }
    | undefined;
  urlService: BrowserUrlService;
  shareableUrlForSavedObject?: string;
  shareableUrl?: string;
  isEmbedded?: boolean;
  action: any;
}

export enum ExportUrlAsType {
  EXPORT_URL_AS_SAVED_OBJECT = 'savedObject',
  EXPORT_URL_AS_SNAPSHOT = 'snapshot',
}

export const EmbedModal = ({
  urlParamExtensions,
  shareableUrlLocatorParams,
  urlService,
  shareableUrlForSavedObject,
  shareableUrl,
  isEmbedded,
  action,
}: EmbedProps) => {
  const [urlParams, setUrlParams] = useState<any>();
  const [useShortUrl, setUseShortUrl] = useState<boolean>(true);
  const [exportUrlAs] = useState<ExportUrlAsType>(ExportUrlAsType.EXPORT_URL_AS_SAVED_OBJECT);
  const [url, setUrl] = useState<undefined | string>(undefined);
  const [, setIsCreatingShortUrl] = useState<boolean>(false);
  const [, setShortUrlErrorMsg] = useState<string | undefined>('');
  const [shortUrlCache, setShortUrlCache] = useState<undefined | string>();
  const [anonymousAccessParameters] = useState<AnonymousAccessState['accessURLParameters']>(null);
  const [usePublicUrl] = useState<boolean>(false);

  const getUrlParamExtensions = (tempUrl: string): string => {
    return urlParams
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
  };

  const makeUrlEmbeddable = (tempUrl: string): string => {
    const embedParam = '?embed=true';
    const urlHasQueryString = tempUrl.indexOf('?') !== -1;

    if (urlHasQueryString) {
      return tempUrl.replace('?', `${embedParam}&`);
    }

    return `${tempUrl}${embedParam}`;
  };

  const updateUrlParams = (tempUrl: string) => {
    tempUrl = isEmbedded ? makeUrlEmbeddable(tempUrl) : tempUrl;
    tempUrl = urlParams ? getUrlParamExtensions(tempUrl) : tempUrl;

    return tempUrl;
  };

  const getSnapshotUrl = (forSavedObject?: boolean) => {
    let tempUrl = '';
    if (forSavedObject && shareableUrlForSavedObject) {
      tempUrl = shareableUrlForSavedObject;
    }
    if (!tempUrl) {
      tempUrl = shareableUrl || window.location.href;
    }
    return updateUrlParams(tempUrl);
  };

  const getSavedObjectUrl = () => {
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
  };

  const createShortUrl = async () => {
    setIsCreatingShortUrl(true);
    setShortUrlErrorMsg(undefined);

    try {
      if (shareableUrlLocatorParams) {
        const shortUrls = urlService.shortUrls.get(null);
        const shortUrl = await await shortUrls.createWithLocator(shareableUrlLocatorParams);
        setShortUrlCache(await shortUrl.locator.getUrl(shortUrl.params, { absolute: true }));
      } else {
        const snapshotUrl = getSnapshotUrl();
        const shortUrl = await urlService.shortUrls.get(null).createFromLongUrl(snapshotUrl);
        setShortUrlCache(shortUrl.url);
      }

      setIsCreatingShortUrl(false);
      setUseShortUrl(true);
      setUrlHelper();
    } catch (fetchError) {
      setShortUrlCache(undefined);
      setUseShortUrl(false);
      setIsCreatingShortUrl(false);
      setShortUrlErrorMsg(
        i18n.translate('share.urlPanel.unableCreateShortUrlErrorMessage', {
          defaultMessage: 'Unable to create short URL. Error: {errorMessage}',
          values: {
            errorMessage: fetchError.message,
          },
        })
      );
      setUrlHelper();
    }
  };

  const addUrlAnonymousAccessParameters = (tempUrl: string): string => {
    if (!anonymousAccessParameters || !usePublicUrl) {
      return tempUrl;
    }

    const parsedUrl = new URL(tempUrl);

    for (const [name, value] of Object.entries(anonymousAccessParameters)) {
      parsedUrl.searchParams.set(name, value);
    }

    return parsedUrl.toString();
  };

  const makeIframeTag = (tempUrl?: string) => {
    if (!tempUrl) {
      return;
    }

    return `<iframe src="${tempUrl}" height="600" width="800"></iframe>`;
  };

  const setUrlHelper = () => {
    let tempUrl: string | undefined;

    if (exportUrlAs === ExportUrlAsType.EXPORT_URL_AS_SAVED_OBJECT) {
      tempUrl = getSavedObjectUrl();
    } else if (useShortUrl) {
      tempUrl = shortUrlCache;
    } else {
      tempUrl = getSnapshotUrl();
    }

    if (url) {
      tempUrl = addUrlAnonymousAccessParameters(url);
    }

    if (isEmbedded) {
      tempUrl = makeIframeTag(url);
    }

    setUrl(tempUrl);
  };

  const renderButtons = () => {
    const { dataTestSubj, formattedMessageId, defaultMessage } = action;
    return (
      <EuiCopy textToCopy={''}>
        {(copy) => (
          <EuiButton fill data-test-subj={dataTestSubj} onClick={copy}>
            <FormattedMessage id={formattedMessageId} defaultMessage={defaultMessage} />
          </EuiButton>
        )}
      </EuiCopy>
    );
  };

  const renderUrlParamExtensions = () => {
    if (!urlParamExtensions) {
      return;
    }

    const setParamValue =
      (paramName: string) =>
      (values: { [queryParam: string]: boolean } = {}): void => {
        setUrlParams({ [paramName]: { ...values } });
        useShortUrl ? createShortUrl() : setUrlHelper();
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
  return (
    <>
      <EuiForm>
        <EuiSpacer size="s" />
        <EuiFormHelpText>
          <FormattedMessage
            id="share.embed.helpText"
            defaultMessage="Embed this dashboard into another webpage. Select which items to include in the embeddable view."
          />
        </EuiFormHelpText>
        <EuiSpacer />
        {renderUrlParamExtensions()}
        <EuiSpacer />
      </EuiForm>
      <EuiModalFooter>{renderButtons()}</EuiModalFooter>
    </>
  );
};
