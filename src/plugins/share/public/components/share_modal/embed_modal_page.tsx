/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiCheckboxGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiRadioGroup,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';
import { Capabilities } from '@kbn/core-capabilities-common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import React, { FC, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { format as formatUrl, parse as parseUrl } from 'url';
import { AnonymousAccessServiceContract, LocatorPublic } from '../../../common';
import { BrowserUrlService, UrlParamExtension } from '../../types';
import { ExportUrlAsType } from '../url_panel_content';

interface EmbedModalPageProps {
  isEmbedded?: boolean;
  allowShortUrl: boolean;
  shareableUrlForSavedObject?: string;
  shareableUrlLocatorParams?: {
    locator: LocatorPublic<any>;
    params: any;
  };
  objectId: string;
  objectType: string;
  shareableUrl?: string;
  urlParamExtensions?: UrlParamExtension[];
  anonymousAccess?: AnonymousAccessServiceContract;
  showPublicUrlSwitch?: (anonymousUserCapabilities: Capabilities) => boolean;
  urlService: BrowserUrlService;
  snapshotShareWarning?: string;
  onClose: () => void;
}

interface UrlParams {
  [extensionName: string]: {
    [queryParam: string]: boolean;
  };
}

export const EmbedModalPage: FC<EmbedModalPageProps> = (props: EmbedModalPageProps) => {
  const {
    objectId,
    allowShortUrl,
    isEmbedded,
    shareableUrl,
    shareableUrlForSavedObject,
    shareableUrlLocatorParams,
    urlService,
    onClose,
  } = props;
  const isMounted = useMountedState();
  const [, isCreatingShortUrl] = useState<boolean>(false);
  const [urlParams] = useState<undefined | UrlParams>(undefined);
  const [, setShortUrl] = useState<EuiSwitchEvent | string | boolean>();
  const [shortUrlErrorMsg, setShortUrlErrorMsg] = useState<string | undefined>(undefined);
  const [checkboxSelectedMap, setCheckboxIdSelectedMap] = useState({ ['0']: true });
  const [selectedRadio, setSelectedRadio] = useState<string>('0');
  const [exportUrlAs, setExportUrlAs] = useState<ExportUrlAsType>(
    ExportUrlAsType.EXPORT_URL_AS_SNAPSHOT
  );
  const [shortUrlCache, setShortUrlCache] = useState<undefined | string>(undefined);
  const [anonymousAccessParameters, setAnonymousAccessParameters] =
    useState<null | AnonymousAccessServiceContract>(null);
  const [usePublicUrl, setUsePublicUrl] = useState<boolean>(false);

  const shortUrlLabel = (
    <FormattedMessage id="share.urlPanel.shortUrlLabel" defaultMessage="Short URL" />
  );
  const switchLabel =
    isCreatingShortUrl !== undefined ? (
      <span>
        <EuiLoadingSpinner size="s" /> {shortUrlLabel}
      </span>
    ) : (
      shortUrlLabel
    );

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

    return url;
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

  const createShortUrl = async () => {
    setShortUrl(true);
    setShortUrlErrorMsg(undefined);

    try {
      if (shareableUrlLocatorParams) {
        const shortUrls = urlService.shortUrls.get(null);
        const shortUrl = await shortUrls.createWithLocator(shareableUrlLocatorParams);
        setShortUrlCache(await shortUrl.locator.getUrl(shortUrl.params, { absolute: true }));
      } else {
        const snapshotUrl = getSnapshotUrl();
        const shortUrl = await urlService.shortUrls.get(null).createFromLongUrl(snapshotUrl);
        setShortUrlCache(shortUrl.url);
      }
    } catch (fetchError) {
      if (!isMounted) {
        return;
      }

      setShortUrlCache(undefined);
      setShortUrl(false);
      isCreatingShortUrl(false);
      setShortUrlErrorMsg(
        i18n.translate('share.urlPanel.unableCreateShortUrlErrorMessage', {
          defaultMessage: 'Unable to create short URL. Error: {errorMessage}',
          values: {
            errorMessage: fetchError.message,
          },
        })
      );
    }
    setUrl();
  };

  const isNotSaved = () => {
    return objectId === undefined || objectId === '';
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

  const addUrlAnonymousAccessParameters = (url: string): string => {
    if (!anonymousAccessParameters || !usePublicUrl) {
      return url;
    }

    const parsedUrl = new URL(url);

    for (const [name, value] of Object.entries(anonymousAccessParameters)) {
      parsedUrl.searchParams.set(name, value);
    }

    return parsedUrl.toString();
  };

  const makeIframeTag = (url?: string) => {
    if (!url) {
      return;
    }

    return `<iframe src="${url}" height="600" width="800"></iframe>`;
  };

  const renderWithIconTip = (child: React.ReactNode, tipContent: React.ReactNode) => {
    return (
      <EuiFlexGroup gutterSize="none" responsive={false}>
        <EuiFlexItem grow={false}>{child}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip content={tipContent} position="bottom" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  const setUrl = () => {
    let url: string | undefined;

    if (exportUrlAs === ExportUrlAsType.EXPORT_URL_AS_SAVED_OBJECT) {
      url = getSavedObjectUrl();
    } else if (setShortUrl !== undefined) {
      url = shortUrlCache;
    } else {
      url = getSnapshotUrl();
    }

    if (url) {
      url = addUrlAnonymousAccessParameters(url);
    }

    if (isEmbedded) {
      url = makeIframeTag(url);
    }

    setUrl();
  };

  const handleShortUrlChange = async (evt: EuiSwitchEvent) => {
    const isChecked = evt.target.checked;

    if (!isChecked || shortUrlCache !== undefined) {
      setShortUrl(true);
      setUrl();
      return;
    }

    // "Use short URL" is checked but shortUrl has not been generated yet so one needs to be created.
    createShortUrl();
  };

  const checkboxOnChangeHandler = (id: string): void => {
    const newCheckboxMap = {
      ...checkboxSelectedMap,
      ...{
        [id]: !checkboxSelectedMap,
      },
    };
    setCheckboxIdSelectedMap(newCheckboxMap);
  };

  const checkboxOptions = [
    { id: '0', label: 'Filter bar' },
    { id: '1', label: 'Query' },
    { id: '2', label: 'Time filter' },
    { id: '3', label: 'Top menu' },
  ];

  const radioOptions = [
    { id: '0', label: 'Saved object' },
    { id: '1', label: 'Snapshot' },
  ];

  return (
    <I18nProvider>
      <EuiForm className="kbnShareContextMenu__finalPanel" data-test-subj="shareUrlForm">
        <EuiFlexGroup direction="row">
          <EuiFlexItem grow={1}>
            <EuiCheckboxGroup
              options={checkboxOptions}
              idToSelectedMap={checkboxSelectedMap}
              onChange={(id) => checkboxOnChangeHandler(id)}
              compressed
              data-test-subj="embed-radio-group"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiRadioGroup
              options={radioOptions}
              onChange={(id) => setSelectedRadio(id)}
              name="embed radio group"
              idSelected={selectedRadio}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            {allowShortUrl && (
              <EuiSwitch
                label={switchLabel}
                checked={allowShortUrl}
                onChange={(id) => setShortUrl(id)}
                data-test-subj="useShortUrl"
              />
            )}
          </EuiFlexItem>
          <EuiSpacer size="m" />
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiFlexGroup direction="row" justifyContent="flexEnd">
          <EuiButton fill onSubmit={onClose}>
            <FormattedMessage id="share.embed.doneButton" defaultMessage="Done" />
          </EuiButton>
        </EuiFlexGroup>
      </EuiForm>
    </I18nProvider>
  );
};
