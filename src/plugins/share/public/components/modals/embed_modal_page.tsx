/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCheckboxGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormLabel,
  EuiFormRow,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiRadioGroup,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';
import { Capabilities } from '@kbn/core-capabilities-common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import React, { FC, useEffect, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { format as formatUrl, parse as parseUrl } from 'url';
import { AnonymousAccessServiceContract, LocatorPublic } from '../../../common';
import { BrowserUrlService, UrlParamExtension } from '../../types';

export enum ExportUrlAsType {
  EXPORT_URL_AS_SAVED_OBJECT = 'savedObject',
  EXPORT_URL_AS_SNAPSHOT = 'snapshot',
}
interface EmbedModalPageProps {
  isEmbedded?: boolean;
  allowShortUrl: boolean;
  shareableUrlForSavedObject?: string;
  shareableUrlLocatorParams?: {
    locator: LocatorPublic<any>;
    params: any;
  };
  objectId?: string;
  objectType: string;
  shareableUrl?: string;
  urlParamExtensions?: UrlParamExtension[];
  anonymousAccess?: AnonymousAccessServiceContract;
  showPublicUrlSwitch?: (anonymousUserCapabilities: Capabilities) => boolean;
  urlService: BrowserUrlService;
  snapshotShareWarning?: string;
  onClose: () => void;
}

export const EmbedModal: FC<EmbedModalPageProps> = (props: EmbedModalPageProps) => {
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
  const [useShortUrl, setUseShortUrl] = useState<boolean>(false);
  const [createShortUrl, isCreatingShortUrl] = useState<boolean>(false);
  const [urlParams, setUrlParams] = useState<undefined | UrlParams>(undefined);
  const [, setShortUrl] = useState<EuiSwitchEvent | string | boolean>();
  const [shortUrlErrorMsg, setShortUrlErrorMsg] = useState<string | undefined>(undefined);
  const [checkboxSelectedMap, setCheckboxIdSelectedMap] = useState<Record<string, boolean>>({
    ['filterBar']: true,
  });
  const [selectedRadio, setSelectedRadio] = useState<string>('savedObject');
  const [url, setUrl] = useState<string>('');
  const [exportUrlAs] = useState<ExportUrlAsType>(ExportUrlAsType.EXPORT_URL_AS_SNAPSHOT);
  const [shortUrlCache, setShortUrlCache] = useState<undefined | string>(undefined);
  const [anonymousAccessParameters] = useState<null | AnonymousAccessServiceContract>(null);
  const [usePublicUrl] = useState<boolean>(false);
  const [checkShortUrlSwitch, setCheckShortUrlSwitch] = useState<boolean>(true);

  useEffect(() => {
    isMounted();
    setUrlHelper();
    resetUrl();
    return function cleanup() {
      resetUrl();
      !isMounted();
    };
  }, []);

  interface UrlParams {
    [extensionName: string]: {
      [queryParam: string]: boolean;
    };
  }

  const makeUrlEmbeddable = (tempUrl: string): string => {
    const embedParam = '?embed=true';
    const urlHasQueryString = tempUrl.indexOf('?') !== -1;

    if (urlHasQueryString) {
      return tempUrl.replace('?', `${embedParam}&`);
    }

    return `${tempUrl}${embedParam}`;
  };

  const makeIframeTag = (tempUrl?: string) => {
    if (!tempUrl) {
      return;
    }

    return `<iframe src="${tempUrl}" height="600" width="800"></iframe>`;
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

  const resetUrl = () => {
    if (isMounted()) {
      setShortUrlCache(undefined);
      setUseShortUrl(false);
      setUrlHelper();
    }
  };

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

  const createShortUrlHelper = async () => {
    isCreatingShortUrl(true);
    setShortUrlErrorMsg(undefined);

    try {
      if (shareableUrlLocatorParams) {
        const tempShortUrls = urlService.shortUrls.get(null);
        const tempShortUrl = await tempShortUrls.createWithLocator(shareableUrlLocatorParams);
        setShortUrlCache(
          await tempShortUrl.locator.getUrl(tempShortUrl.params, { absolute: true })
        );
      } else {
        const snapshotUrl = getSnapshotUrl();
        const tempShortUrl = await urlService.shortUrls.get(null).createFromLongUrl(snapshotUrl);
        setShortUrlCache(tempShortUrl.url);
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
    setUrlHelper();
  };

  const isNotSaved = () => {
    return objectId === undefined || objectId === '';
  };

  const getSavedObjectUrl = () => {
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

  const setUrlHelper = () => {
    let tempUrl: string | undefined;

    if (exportUrlAs === ExportUrlAsType.EXPORT_URL_AS_SAVED_OBJECT) {
      tempUrl = getSavedObjectUrl();
    } else if (setShortUrl !== undefined) {
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

    if (tempUrl !== undefined) setUrl(tempUrl);
  };

  const handleShortUrlChange = (evt: { target: { checked: React.SetStateAction<boolean> } }) => {
    setCheckShortUrlSwitch(evt.target.checked);
    if (!checkShortUrlSwitch || shortUrlCache !== undefined) {
      setShortUrl(true);
      setUrlHelper();
      return;
    }

    // "Use short URL" is checked but shortUrl has not been generated yet so one needs to be created.
    createShortUrlHelper();
  };

  const renderShortUrlSwitch = () => {
    if (exportUrlAs === ExportUrlAsType.EXPORT_URL_AS_SAVED_OBJECT || !allowShortUrl) {
      return null;
    }
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
    const switchComponent = (
      <EuiSwitch
        label={switchLabel}
        onChange={handleShortUrlChange}
        checked={checkShortUrlSwitch}
        data-test-subj="useShortUrl"
      />
    );
    const tipContent = (
      <FormattedMessage
        id="share.urlPanel.shortUrlHelpText"
        defaultMessage="We recommend sharing shortened snapshot URLs for maximum compatibility.
          Internet Explorer has URL length restrictions,
          and some wiki and markup parsers don't do well with the full-length version of the snapshot URL,
          but the short URL should work great."
      />
    );

    return (
      <EuiFormRow helpText={shortUrlErrorMsg} data-test-subj="createShortUrl">
        {renderWithIconTip(switchComponent, tipContent)}
      </EuiFormRow>
    );
  };

  const checkboxOnChangeHandler = (id: string): void => {
    setCheckboxIdSelectedMap((prev) => {
      return {
        ...prev,
        [id]: prev[id] ? !prev[id] : true,
      };
    });
  };

  const checkboxOptions = [
    { id: 'filterBar', label: 'Filter bar', 'data-test-sub': 'filter-bar-embed' },
    { id: 'query', label: 'Query', 'data-test-sub': 'query-embed' },
    { id: 'timeFilter', label: 'Time filter', 'data-test-sub': 'time-filter-embed' },
    { id: 'topMenu', label: 'Top menu', 'data-test-sub': 'top-menu-embed' },
  ];

  const radioOptions = [
    { id: 'savedObject', label: 'Saved object' },
    { id: 'snapshot', label: 'Snapshot' },
  ];

  const setParamValue =
    (paramName: string) =>
    (values: { [queryParam: string]: boolean } = {}): void => {
      setUrlParams({ [paramName]: { ...values } });
      useShortUrl ? createShortUrlHelper() : setUrlHelper();
    };

  return (
    <EuiModal maxWidth={false} onClose={onClose}>
      <I18nProvider>
        <EuiModalHeader>
          <EuiModalHeaderTitle>{`Embed this ${props.objectType}`}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiForm className="kbnShareContextMenu__finalPanel" data-test-subj="shareUrlForm">
            <EuiFlexGroup direction="column">
              <EuiFlexItem  grow={1}>
                <EuiCheckboxGroup
                  options={checkboxOptions}
                  idToSelectedMap={checkboxSelectedMap}
                  onChange={(id) => checkboxOnChangeHandler(id)}
                  data-test-subj="embed-radio-group"
                  legend={{
                    children: <span>Include</span>
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={1}>
                <EuiRadioGroup
                  options={radioOptions}
                  onChange={(id) => setSelectedRadio(id)}
                  name="embed radio group"
                  idSelected={selectedRadio}
                  legend={{
                    children: <span>Generate as</span>
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            {/* <EuiSpacer size="m" />
            <EuiFlexGroup> */}
              {/* {props.urlParamExtensions && props.urlParamExtensions?.map(({paramName}) => { */}
              {/* <EuiButton fill onClick={() => setParamValue('embed')}>
                <FormattedMessage id="share.embed.embedButton" defaultMessage="Copy Embed" />
              </EuiButton> */}
              {/* })} */}
            {/* </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiFlexGroup direction="row" justifyContent="flexEnd">
              <EuiButton fill onClick={onClose}>
                <FormattedMessage id="share.embed.doneButton" defaultMessage="Done" />
              </EuiButton>
            </EuiFlexGroup> */}
          </EuiForm>
        </EuiModalBody>
        <EuiModalFooter>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>{allowShortUrl && renderShortUrlSwitch()}</EuiFlexItem>
            <EuiFlexItem grow={0}>
              <EuiFlexGroup gutterSize="m">
                <EuiFlexItem>
                  <EuiButtonEmpty onClick={onClose}>
                    <FormattedMessage id="share.embed.doneButton" defaultMessage="Done" />
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButton fill onClick={() => setParamValue('embed')}>
                    <FormattedMessage id="share.embed.embedButton" defaultMessage="Copy Embed" />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalFooter>
      </I18nProvider>
    </EuiModal>
  );
};
