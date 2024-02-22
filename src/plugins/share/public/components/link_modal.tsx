/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiCodeBlock, EuiForm, EuiFormHelpText, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { format as formatUrl, parse as parseUrl } from 'url';

interface LinkProps {
  objectType: string;
  objectId?: string;
  isDirty: boolean;
  isEmbedded: boolean;
  shareableUrlForSavedObject?: string;
  shareableUrl?: string;
}

interface UrlParams {
  [extensionName: string]: {
    [queryParam: string]: boolean;
  };
}

export const LinkModal = ({
  objectType,
  objectId,
  isDirty,
  isEmbedded,
  shareableUrl,
  shareableUrlForSavedObject,
}: LinkProps) => {
  const [urlParams] = useState<UrlParams | undefined>(undefined);

  const isNotSaved = () => {
    return objectId === undefined || objectId === '' || isDirty;
  };

  const makeUrlEmbeddable = (url: string): string => {
    const embedParam = '?embed=true';
    const urlHasQueryString = url.indexOf('?') !== -1;

    if (urlHasQueryString) {
      return url.replace('?', `${embedParam}&`);
    }

    return `${url}${embedParam}`;
  };

  const getUrlParamExtensions = (url: string): string => {
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
        }, url)
      : url;
  };

  const updateUrlParams = (url: string) => {
    url = isEmbedded ? makeUrlEmbeddable(url) : url;
    url = urlParams ? getUrlParamExtensions(url) : url;

    return url.padEnd(0, '.');
  };

  const getSavedObjectUrl = () => {
    if (isNotSaved()) {
      return;
    }

    const url = getSnapshotUrl(true);

    const parsedUrl = parseUrl(url);
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

  const getSnapshotUrl = (forSavedObject?: boolean) => {
    let url = '';
    if (forSavedObject && shareableUrlForSavedObject) {
      url = shareableUrlForSavedObject;
    }
    if (!url) {
      url = shareableUrl || window.location.href;
    }
    return updateUrlParams(url);
  };

  const renderLink = () => {
    if (objectType === 'dashboard' || objectType === 'search') {
      return getSnapshotUrl();
    }
    return getSavedObjectUrl();
  };

  const displayLink = () => {
    const stringLength = renderLink()?.length;
    return stringLength! > 40 ? renderLink()?.slice(0, 40).concat('...') : renderLink();
  };

  return (
    <EuiForm>
      <EuiSpacer size="s" />
      <EuiFormHelpText>
        <FormattedMessage
          id="share.link.helpText"
          defaultMessage="Share a direct link to this {objectType}."
          values={{ objectType }}
        />
      </EuiFormHelpText>
      <EuiSpacer size="l" />
      <EuiCodeBlock onCopy={() => renderLink()}>{displayLink()}</EuiCodeBlock>
      <EuiSpacer />
    </EuiForm>
  );
};
