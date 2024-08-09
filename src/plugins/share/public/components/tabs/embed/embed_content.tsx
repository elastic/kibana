/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiFlexItem,
  EuiCopy,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { format as formatUrl, parse as parseUrl } from 'url';
import { AnonymousAccessState } from '../../../../common';

import { type IShareContext } from '../../context';

type EmbedProps = Pick<
  IShareContext,
  | 'shareableUrlLocatorParams'
  | 'shareableUrlForSavedObject'
  | 'shareableUrl'
  | 'isEmbedded'
  | 'embedUrlParamExtensions'
  | 'objectType'
> & {
  setIsNotSaved: () => void;
};

interface UrlParams {
  [extensionName: string]: {
    [queryParam: string]: boolean;
  };
}

export enum ExportUrlAsType {
  EXPORT_URL_AS_SAVED_OBJECT = 'savedObject',
  EXPORT_URL_AS_SNAPSHOT = 'snapshot',
}

export const EmbedContent = ({
  embedUrlParamExtensions: urlParamExtensions,
  shareableUrlForSavedObject,
  shareableUrl,
  isEmbedded,
  objectType,
  setIsNotSaved,
}: EmbedProps) => {
  const isMounted = useMountedState();
  const [urlParams, setUrlParams] = useState<UrlParams | undefined>(undefined);
  const [useShortUrl] = useState<boolean>(true);
  const [exportUrlAs] = useState<ExportUrlAsType>(ExportUrlAsType.EXPORT_URL_AS_SAVED_OBJECT);
  const [url, setUrl] = useState<string>('');
  const [shortUrlCache, setShortUrlCache] = useState<string | undefined>(undefined);
  const [anonymousAccessParameters] = useState<AnonymousAccessState['accessURLParameters']>(null);
  const [usePublicUrl] = useState<boolean>(false);

  useEffect(() => {
    if (objectType !== 'dashboard') setIsNotSaved();
  }, [url, setIsNotSaved, objectType]);

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
  }, [getUrlParamExtensions, resetUrl, setUrlHelper, url]);

  const renderUrlParamExtensions = () => {
    if (!urlParamExtensions) {
      return null;
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
        <EuiSpacer />
      </EuiForm>
      <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiCopy textToCopy={url}>
            {(copy) => (
              <EuiButton
                data-test-subj="copyEmbedUrlButton"
                onClick={copy}
                data-share-url={url}
                fill
              >
                <FormattedMessage
                  id="share.link.copyEmbedCodeButton"
                  defaultMessage="Copy embed code"
                />
              </EuiButton>
            )}
          </EuiCopy>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
