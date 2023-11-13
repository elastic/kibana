/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiCheckboxGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiRadioGroup,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { Capabilities } from '@kbn/core-capabilities-common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { FC, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { AnonymousAccessServiceContract, LocatorPublic } from '../../../common';
import { BrowserUrlService, UrlParamExtension } from '../../types';
import { ExportUrlAsType } from '../url_panel_content';
import { format as formatUrl, parse as parseUrl } from 'url';

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
}

interface UrlParams {
  [extensionName: string]: {
    [queryParam: string]: boolean;
  };
}

export const EmbedModalPage: FC<EmbedModalPageProps> = (props: EmbedModalPageProps) => {
  const { objectId, allowShortUrl, isEmbedded, shareableUrl, shareableUrlForSavedObject, shareableUrlLocatorParams, urlService } =
    props;
  const isMounted = useMountedState();
  const [, isCreatingShortUrl] = useState<boolean>(false)
  const [ urlParams, setUrlParams] = useState<undefined | UrlParams>(undefined)
  const [shortUrl, setShortUrl] = useState<EuiSwitchEvent | string | boolean>();
  const [shortUrlErrorMsg, setShortUrlErrorMsg] = useState<string | undefined>(undefined);
  const [checkboxSelectedMap, setCheckboxIdSelectedMap] = useState<object>({ ['0']: true });
  const [selectedRadio, setSelectedRadio] = useState<string>('0');
  const [exportUrlAs, setExportUrlAs] = useState<ExportUrlAsType>(ExportUrlAsType.EXPORT_URL_AS_SNAPSHOT)
  const [shortUrlCache, setShortUrlCache] = useState<undefined | string>(undefined)
  const [ anonymousAccessParameters, setAnonymousAccessParameters] = useState<null | AnonymousAccessServiceContract>(null);
  const [ usePublicUrl, setUsePublicUrl ] = useState<boolean>(false)

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
        ? Object.keys(urlParams).reduce((urlAccumulator, key: string | number) => {
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
  
      setUrl()
    };

    const createShortUrl = async () => {
        setShortUrl(true)
        setShortUrlErrorMsg(undefined)
  
      try {
        if (shareableUrlLocatorParams) {
          const shortUrls = urlService.shortUrls.get(null);
          setShortUrl(await shortUrls.createWithLocator(shareableUrlLocatorParams));
          setShortUrlCache(await shortUrls.locator.getUrl(shortUrl?.params, { absolute: true }));
        } else {
          const snapshotUrl = getSnapshotUrl();
          const shortUrl = await urlService.shortUrls
            .get(null)
            .createFromLongUrl(snapshotUrl);
          setShortUrlCache(shortUrl.url);
        }
  
        if (!isMounted) {
          return;
        }
  
        isCreatingShortUrl(false)
        setShortUrl(true)
        setUrl()
      } catch (fetchError) {
        if (!isMounted) {
          return;
        }  
        

        setShortUrlCache(undefined);
        setShortUrl(false);
        isCreatingShortUrl(false);
        setShortUrlErrorMsg(i18n.translate('share.urlPanel.unableCreateShortUrlErrorMessage', {
          defaultMessage: 'Unable to create short URL. Error: {errorMessage}',
          values: {
            errorMessage: fetchError.message,
          },
        }))
        setUrl();
      }
    };
  

  const handleShortUrlChange = async (evt: EuiSwitchEvent) => {
      const isChecked = evt.target.checked;
  
      if (!isChecked || shortUrlCache !== undefined) {
        setShortUrl(true) 
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

  const renderShortUrlSwitch = () => {
    if (
      exportUrlAs === ExportUrlAsType.EXPORT_URL_AS_SAVED_OBJECT ||
      !allowShortUrl
    ) {
      return null;
    }
    const shortUrlLabel = (
      <FormattedMessage id="share.urlPanel.shortUrlLabel" defaultMessage="Short URL" />
    );
    // const switchLabel = isCreatingShortUrl ? (
    //   <span>
    //     <EuiLoadingSpinner size="s" /> {shortUrlLabel}
    //   </span>
    // ) : (
    //   shortUrlLabel
    // );
    const switchComponent = (
      <EuiSwitch
        label={switchLabel}
        checked={Boolean(setShortUrl)}
        onChange={handleShortUrlChange}
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
    <EuiForm className="kbnShareContextMenu__finalPanel">
      <EuiFlexGroup
        direction="row"
        // css={css`
        //   display: grid;
        //   grid-template-columns: repeat(3, );
        //   justify-content: space-between;
        // `}
      >
        <EuiFlexItem grow={1}>
          <EuiCheckboxGroup
            options={[
              { id: useGeneratedHtmlId({ prefix: '0' }), label: 'Filter bar' },
              { id: useGeneratedHtmlId({ prefix: '1' }), label: 'Query' },
              { id: useGeneratedHtmlId({ prefix: '2' }), label: 'Time filter' },
              { id: useGeneratedHtmlId({ prefix: '3' }), label: 'Top menu' },
            ]}
            idToSelectedMap={checkboxSelectedMap}
            onChange={(id) => checkboxOnChangeHandler(id)}
            compressed
            data-test-subj="embed-radio-group"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiRadioGroup
            options={[
              { id: '0', label: 'Saved object' },
              { id: '1', label: 'Snapshot' },
            ]}
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
    </EuiForm>
  );
};
