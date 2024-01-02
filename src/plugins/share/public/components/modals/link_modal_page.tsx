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
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiModal,
  EuiRadioGroup,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { format as formatUrl, parse as parseUrl } from 'url';
import React, { FC, useCallback, useEffect, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { i18n } from '@kbn/i18n';
import { Capabilities } from '@kbn/core/public';
import {
  AnonymousAccessServiceContract,
  AnonymousAccessState,
  LocatorPublic,
} from '../../../common';
import { BrowserUrlService } from '../../types';

export enum ExportUrlAsType {
  EXPORT_URL_AS_SAVED_OBJECT = 'savedObject',
  EXPORT_URL_AS_SNAPSHOT = 'snapshot',
}

interface UrlParams {
  [extensionName: string]: {
    [queryParam: string]: boolean;
  };
}
interface LinksModalPageProps {
  isEmbedded: boolean;
  allowShortUrl: boolean;
  objectId?: string;
  onClose: () => void;
  shareableUrlForSavedObject?: string;
  shareableUrlLocatorParams?: {
    locator: LocatorPublic<any>;
    params: any;
  };
  urlService: BrowserUrlService;
  shareableUrl?: string;
  objectType: string;
  snapshotShareWarning?: string;
  anonymousAccess?: AnonymousAccessServiceContract;
  showPublicUrlSwitch?: ((anonymousUserCapabilities: Capabilities) => boolean) | undefined;
}

export const LinkModal: FC<LinksModalPageProps> = (props: LinksModalPageProps) => {
  const {
    objectId,
    allowShortUrl,
    isEmbedded,
    shareableUrl,
    shareableUrlForSavedObject,
    shareableUrlLocatorParams,
    urlService,
    onClose,
    objectType,
    snapshotShareWarning,
    anonymousAccess,
    showPublicUrlSwitch,
  } = props;

  const isMounted = useMountedState();
  const [shortUrlCache, setShortUrlCache] = useState<undefined | string>(undefined);
  const [exportUrlAs, setExportUrlAs] = useState<ExportUrlAsType>(
    ExportUrlAsType.EXPORT_URL_AS_SAVED_OBJECT
  );
  const [useShortUrl] = useState<EuiSwitchEvent | string | boolean>(false);
  const [usePublicUrl, setUsePublicUrl] = useState<boolean>(false);
  const [url, setUrl] = useState<string>('');
  const [anonymousAccessParameters, setAnonymousAccessParameters] = useState<
    null | AnonymousAccessState['accessURLParameters']
  >(null);
  const [showWarningButton, setShowWarningButton] = useState<boolean>(
    Boolean(snapshotShareWarning)
  );
  const [isCreatingShortUrl, setIsCreatingShortUrl] = useState<boolean | string>(false);
  const [urlParams] = useState<undefined | UrlParams>(undefined);
  const [, setShortUrl] = useState<EuiSwitchEvent | string | boolean>();
  const [shortUrlErrorMsg, setShortUrlErrorMsg] = useState<string | undefined>(undefined);
  const [selectedRadio, setSelectedRadio] = useState<string>('savedObject');
  const [checkShortUrlSwitch, setCheckShortUrlSwitch] = useState<boolean>(true);

  const makeUrlEmbeddable = (tempUrl: string): string => {
    const embedParam = '?embed=true';
    const urlHasQueryString = tempUrl.indexOf('?') !== -1;

    if (urlHasQueryString) {
      return tempUrl.replace('?', `${embedParam}&`);
    }

    return `${tempUrl}${embedParam}`;
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
      tempUrl = isEmbedded ? makeUrlEmbeddable(tempUrl) : tempUrl;
      tempUrl = urlParams ? getUrlParamExtensions(tempUrl) : tempUrl;
      setUrl(tempUrl);
      return url;
    },
    [getUrlParamExtensions, isEmbedded, url, urlParams]
  );

  const getSnapshotUrl = useCallback(
    (forSavedObject?: boolean) => {
      let tempUrl = '';
      if (forSavedObject && shareableUrlForSavedObject) {
        tempUrl = shareableUrlForSavedObject;
        setUrl(tempUrl);
      }
      if (!tempUrl) {
        tempUrl = shareableUrl ?? window.location.href;
        setUrl(tempUrl);
      }
      return updateUrlParams(tempUrl);
    },
    [shareableUrl, shareableUrlForSavedObject, updateUrlParams]
  );

  const saveNeeded =
    objectId === undefined || (objectId === '' && objectType === 'dashboard') ? (
      <FormattedMessage
        id="share.linkModalPage.saveWorkDescription"
        defaultMessage="One or more panels on this dashboard have changed. Before you generate a snapshot, save the dashboard."
      />
    ) : null;

  const getSavedObjectUrl = useCallback(() => {
    if (objectId === undefined || objectId === '') {
      return;
    }

    const tempUrl = getSnapshotUrl();

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
  }, [getSnapshotUrl, updateUrlParams, objectId]);

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

  const createShortUrl = async () => {
    setShortUrl(true);
    setShortUrlErrorMsg(undefined);

    try {
      if (shareableUrlLocatorParams) {
        const shortUrls = urlService.shortUrls.get(null);
        const tempShortUrl = await shortUrls.createWithLocator(shareableUrlLocatorParams);
        setShortUrlCache(
          await tempShortUrl.locator.getUrl(tempShortUrl.params, { absolute: true })
        );
      } else {
        const snapshotUrl = getSnapshotUrl(true);
        const tempShortUrl = await urlService.shortUrls.get(null).createFromLongUrl(snapshotUrl);
        setShortUrlCache(tempShortUrl.url);
      }
    } catch (fetchError) {
      if (!isMounted) {
        return;
      }

      setShortUrlCache(undefined);
      setShortUrl(true);
      setIsCreatingShortUrl(false);
      setShortUrlErrorMsg(
        i18n.translate('share.urlPanel.unableCreateShortUrlErrorMessage', {
          defaultMessage: 'Unable to create short URL. Error: {errorMessage}',
          values: {
            errorMessage: fetchError.message,
          },
        })
      );
    }
  };

  const setUrlHelper = useCallback(() => {
    if (exportUrlAs === ExportUrlAsType.EXPORT_URL_AS_SAVED_OBJECT) {
      setUrl(getSavedObjectUrl()!);
    } else if (useShortUrl !== undefined && shortUrlCache !== undefined) {
      setUrl(shortUrlCache);
    } else {
      getSnapshotUrl(true);
    }

    if (url !== '') {
      setUrl(addUrlAnonymousAccessParameters(url));
    }

    setUrl(url);
  }, [
    addUrlAnonymousAccessParameters,
    exportUrlAs,
    getSavedObjectUrl,
    getSnapshotUrl,
    shortUrlCache,
    url,
    useShortUrl,
  ]);

  useEffect(() => {
    isMounted();
    setUrlHelper();
    if (anonymousAccess) {
      (async () => {
        if (!isMounted) {
          return;
        }

        if (!anonymousAccessParameters) {
          return;
        }

        if (showPublicUrlSwitch) {
          const anonymousUserCapabilities = await anonymousAccess!.getCapabilities();

          if (!isMounted()) {
            return;
          }

          try {
            setUsePublicUrl!(Boolean(anonymousUserCapabilities));
          } catch {
            setUsePublicUrl(false);
          }
        }
        setAnonymousAccessParameters(anonymousAccessParameters);
        setUsePublicUrl(true);
      })();
    }
  }, [anonymousAccess, anonymousAccessParameters, isMounted, setUrlHelper, showPublicUrlSwitch]);

  const handleShortUrlChange = (evt: { target: { checked: React.SetStateAction<boolean> } }) => {
    setCheckShortUrlSwitch(evt.target.checked);
    if (!checkShortUrlSwitch || shortUrlCache !== undefined) {
      setShortUrl(true);
      setUrlHelper();
      return;
    }

    // "Use short URL" is checked but shortUrl has not been generated yet so one needs to be created.
    createShortUrl();
  };

  const handleExportUrlAs = (optionId: string) => {
    setExportUrlAs(optionId as ExportUrlAsType);

    setShowWarningButton(
      Boolean(props.snapshotShareWarning) &&
        (optionId as ExportUrlAsType) === ExportUrlAsType.EXPORT_URL_AS_SNAPSHOT
    );
    setUrlHelper();
  };

  const renderShortUrlSwitch = () => {
    if (exportUrlAs === ExportUrlAsType.EXPORT_URL_AS_SAVED_OBJECT || !allowShortUrl) {
      return null;
    }
    const shortUrlLabel = (
      <FormattedMessage id="share.urlPanel.shortUrlLabel" defaultMessage="Short URL" />
    );

    const switchLabel = isCreatingShortUrl ? (
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

  return (
    <EuiModal onClose={onClose}>
      <EuiForm className="kbnShareContextMenu__finalPanel">
        <EuiSpacer size="xs" />
        <EuiTitle>
          <EuiText>{`Share this ${objectType}`}</EuiText>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiRadioGroup
          options={[
            { id: 'savedObject', label: 'Saved object' },
            { id: 'snapshot', label: 'Snapshot' },
          ]}
          onChange={(id) => {
            setSelectedRadio(id);
            handleExportUrlAs(id);
          }}
          name="embed radio group"
          idSelected={selectedRadio}
          legend={{
            children: (
              <FormattedMessage
                id="share.urlPanel.generateLinkAsLabel"
                defaultMessage="Generate the link as"
              />
            ),
          }}
        />
        <EuiSpacer size="m" />
        {saveNeeded}
        <EuiFlexItem grow={1}>{allowShortUrl && renderShortUrlSwitch()}</EuiFlexItem>
        <EuiSpacer size="m" />
        <EuiFlexGroup>
          <EuiCopy
            beforeMessage={showWarningButton ? props.snapshotShareWarning : undefined}
            textToCopy={url}
            anchorClassName="eui-displayBlock"
          >
            {(copy) => (
              <EuiButton
                fill
                fullWidth
                onClick={copy}
                data-share-url={url}
                data-test-subj="copyShareUrlButton"
                iconType={showWarningButton ? 'warning' : undefined}
                color={showWarningButton ? 'warning' : 'primary'}
              >
                {isEmbedded ? (
                  <FormattedMessage
                    id="share.urlPanel.copyIframeCodeButtonLabel"
                    defaultMessage="Copy iFrame code"
                  />
                ) : (
                  <FormattedMessage
                    id="share.urlPanel.copyLinkButtonLabel"
                    defaultMessage="Copy link"
                  />
                )}
              </EuiButton>
            )}
          </EuiCopy>
          <EuiButton fill onClick={onClose}>
            <FormattedMessage id="share.links.doneButton" defaultMessage="Done" />
          </EuiButton>
        </EuiFlexGroup>
      </EuiForm>
    </EuiModal>
  );
};
