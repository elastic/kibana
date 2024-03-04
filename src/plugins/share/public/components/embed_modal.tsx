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
  EuiFormRow,
  EuiModalFooter,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
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
interface UrlParams {
  [extensionName: string]: {
    [queryParam: string]: boolean;
  };
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
  const isMounted = useMountedState();
  const [urlParams, setUrlParams] = useState<UrlParams | undefined>(undefined);
  const [useShortUrl] = useState<boolean>(true);
  const [exportUrlAs] = useState<ExportUrlAsType>(ExportUrlAsType.EXPORT_URL_AS_SAVED_OBJECT);
  const [url, setUrl] = useState<string>('');
  const [shortUrlCache, setShortUrlCache] = useState<string | undefined>(undefined);
  const [anonymousAccessParameters] = useState<AnonymousAccessState['accessURLParameters']>(null);
  const [usePublicUrl] = useState<boolean>(false);

  const getUrlParamExtensions = useCallback(
    (tempUrl: string): string => {
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
    },
    [urlParams]
  );

  const updateUrlParams = useCallback(
    (tempUrl: string) => {
      tempUrl = urlParams ? getUrlParamExtensions(tempUrl) : tempUrl;
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
  }, [getSnapshotUrl, updateUrlParams]);

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

  const makeIframeTag = (tempUrl: string) => {
    if (!tempUrl) {
      return;
    }

    return `<iframe src="${tempUrl}" height="600" width="800"></iframe>`;
  };

  const setUrlHelper = useCallback(() => {
    let tempUrl: string | undefined;

    if (exportUrlAs === ExportUrlAsType.EXPORT_URL_AS_SAVED_OBJECT) {
      tempUrl = getSavedObjectUrl();
    } else if (useShortUrl && shortUrlCache) {
      tempUrl = shortUrlCache;
    } else {
      tempUrl = getSnapshotUrl();
    }

    if (tempUrl) {
      tempUrl = addUrlAnonymousAccessParameters(tempUrl!);
    }

    if (isEmbedded) {
      tempUrl = makeIframeTag(tempUrl!);
    }
    setUrl(tempUrl!);
  }, [
    addUrlAnonymousAccessParameters,
    exportUrlAs,
    getSavedObjectUrl,
    getSnapshotUrl,
    isEmbedded,
    shortUrlCache,
    useShortUrl,
  ]);

  const resetUrl = useCallback(() => {
    if (isMounted()) {
      setShortUrlCache(undefined);
      setUrlHelper();
    }
  }, [isMounted, setUrlHelper]);

  useEffect(() => {
    setUrlHelper();
    getUrlParamExtensions(url);
    window.addEventListener('hashchange', resetUrl, false);
    isMounted();
  }, [getUrlParamExtensions, resetUrl, setUrlHelper, url, isMounted]);

  const renderButtons = () => {
    const { dataTestSubj, formattedMessageId, defaultMessage } = action;
    return (
      <EuiCopy textToCopy={url}>
        {(copy) => (
          <EuiButton fill data-test-subj={dataTestSubj} data-share-url={url} onClick={copy}>
            <FormattedMessage id={formattedMessageId} defaultMessage={defaultMessage} />
          </EuiButton>
        )}
      </EuiCopy>
    );
  };

  const renderUrlParamExtensions = () => {
    if (!urlParamExtensions) {
      return <></>;
    }

    const setParamValue =
      (paramName: string) =>
      (values: { [queryParam: string]: boolean } = {}): void => {
        setUrlParams({ ...urlParams, [paramName]: { ...values } });
        setUrlHelper();
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
        <EuiSpacer size="m" />
        <EuiText size="s">
          <FormattedMessage
            id="share.embed.helpText"
            defaultMessage="Embed this dashboard into another webpage. Select which items to include in the embeddable view."
          />
        </EuiText>
        <EuiSpacer />
        {renderUrlParamExtensions()}
        <EuiSpacer />
      </EuiForm>
      <EuiModalFooter>{renderButtons()}</EuiModalFooter>
    </>
  );
};
