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
  EuiLoadingSpinner,
  EuiRadioGroup,
  EuiSpacer,
  EuiSwitch,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { Capabilities } from '@kbn/core-capabilities-common';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { FC, useState } from 'react';
import { AnonymousAccessServiceContract, LocatorPublic } from '../../../common';
import { BrowserUrlService, UrlParamExtension } from '../../types';

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

export const EmbedModalPage: FC<EmbedModalPageProps> = (props: EmbedModalPageProps) => {
  const { allowShortUrl, isEmbedded, shareableUrl, shareableUrlForSavedObject, shareableUrlLocatorParams, urlService } =
    props;
  const [ urlParams, setUrlParams] = useState<undefined | string>(undefined)
  const [shortUrl, setShortUrl] = useState('');
  const [shortUrlErrorMsg, setShortUrlErrorMsg] = useState();
  const [checkboxSelectedMap, setCheckboxIdSelectedMap] = useState({ ['0']: true });
  const [selectedRadio, setSelectedRadio] = useState<string>('0');
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

        setShortUrl(true)
        setShortUrlErrorMsg(undefined)
  
      try {
        if (shareableUrlLocatorParams) {
          const shortUrls = urlService.shortUrls.get(null);
          const shortUrl = await shortUrls.createWithLocator(shareableUrlLocatorParams);
          const shortUrlCache = await shortUrl.locator.getUrl(shortUrl.params, { absolute: true });
        } else {
          const snapshotUrl = getSnapshotUrl();
          const shortUrl = await urlService.shortUrls
            .get(null)
            .createFromLongUrl(snapshotUrl);
          const shortUrlCache = shortUrl.url;
        }
  
        if (!mounted) {
          return;
        }
  
        this.setState(
          {
            isCreatingShortUrl: false,
            useShortUrl: true,
          },
          this.setUrl
        );
      } catch (fetchError) {
        if (!mounted) {
          return;
        }
  
        shortUrlCache = undefined;
        this.setState(
          {
            useShortUrl: false,
            isCreatingShortUrl: false,
            shortUrlErrorMsg: i18n.translate('share.urlPanel.unableCreateShortUrlErrorMessage', {
              defaultMessage: 'Unable to create short URL. Error: {errorMessage}',
              values: {
                errorMessage: fetchError.message,
              },
            }),
          },
          this.setUrl
        );
      }
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
