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
  EuiCodeBlock,
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
  Query,
} from '@elastic/eui';
import { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { Capabilities } from '@kbn/core-capabilities-common';
import { HttpStart, NotificationsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import React, { FC, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { format as formatUrl, parse as parseUrl } from 'url';
import type { SavedObjectManagementTypeInfo } from '@kbn/saved-objects-management-plugin/common/types/latest';
import {
  parseQuery,
  getTagFindReferences,
} from '@kbn/saved-objects-management-plugin/public';
import {
  fetchExportByTypeAndSearch,
  extractExportDetails,
} from '@kbn/saved-objects-management-plugin/public/lib';

// @ts-expect-error
import { saveAs } from '@elastic/filesaver';
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
  objectId?: string;
  objectType: string;
  shareableUrl?: string;
  urlParamExtensions?: UrlParamExtension[];
  anonymousAccess?: AnonymousAccessServiceContract;
  showPublicUrlSwitch?: (anonymousUserCapabilities: Capabilities) => boolean;
  urlService: BrowserUrlService;
  snapshotShareWarning?: string;
  onClose: () => void;
  // onExportAll props
  notifications: NotificationsStart;
  http: HttpStart;
  taggingApi: SavedObjectsTaggingApi;
  allowedTypes: SavedObjectManagementTypeInfo[];
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
    notifications,
    http,
    taggingApi,
    allowedTypes,
  } = props;
  const isMounted = useMountedState();
  const [isCreatingShortUrl, setIsCreatingShortUrl] = useState<boolean>(false);
  const [urlParams] = useState<undefined | UrlParams>(undefined);
  const [isShortUrl, setIsShortUrl] = useState<EuiSwitchEvent | string | boolean>();
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
  const [exportAllSelectedOptions, setExportAllSelectedOptions] = useState<Record<string, boolean>>(
    {}
  );
  const [isIncludeReferencesDeepChecked, setIsIncludeReferencesDeepCheck] = useState<boolean>(true);
  const [activeQuery, setActiveQuery] = useState<Query>(Query.parse(''));
  interface UrlParams {
    [extensionName: string]: {
      [queryParam: string]: boolean;
    };
  }

  // useEffect(() => {
  //   setActiveQuery(Query.parse(''))
  // },[])

  const makeUrlEmbeddable = (url: string): string => {
    const embedParam = '?embed=true';
    const urlHasQueryString = url.indexOf('?') !== -1;

    if (urlHasQueryString) {
      return url.replace('?', `${embedParam}&`);
    }

    return `${url}${embedParam}`;
  };

  const makeIframeTag = (url: string) => {
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
    if (forSavedObject && shareableUrlForSavedObject) {
      setUrl(shareableUrlForSavedObject);
    }
    if (!url) {
      setUrl(shareableUrl || window.location.href);
    }
    return updateUrlParams(url);
  };

  const createShortUrl = async () => {
    setIsShortUrl(true);
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
      setIsShortUrl(false);
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
    setUrlHelper();
  };

  const isNotSaved = () => {
    return objectId === undefined || objectId === '';
  };

  const getSavedObjectUrl = () => {
    if (isNotSaved()) {
      return;
    }

    setUrl(getSnapshotUrl(true));

    const parsedUrl = parseUrl(url);
    if (!parsedUrl || !parsedUrl.hash) {
      return url;
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

  const setUrlHelper = () => {
    if (exportUrlAs === ExportUrlAsType.EXPORT_URL_AS_SAVED_OBJECT) {
      setUrl(getSavedObjectUrl()!);
    } else if (isShortUrl !== undefined && shortUrlCache !== undefined) {
      setUrl(shortUrlCache);
    } else {
      setUrl(getSnapshotUrl());
    }

    if (url !== '') {
      setUrl(addUrlAnonymousAccessParameters(url));
    }

    if (isEmbedded && url !== undefined) {
      setUrl(makeIframeTag(url)!);
    }

    setUrl(url);
  };

  const handleShortUrlChange = (evt: { target: { checked: React.SetStateAction<boolean> } }) => {
    setCheckShortUrlSwitch(evt.target.checked);
    if (!checkShortUrlSwitch || shortUrlCache !== undefined) {
      setIsShortUrl(true);
      setUrlHelper();
      return;
    }

    // "Use short URL" is checked but shortUrl has not been generated yet so one needs to be created.
    createShortUrl();
  };

  const onExportAll = async () => {
    const { queryText, selectedTags } = parseQuery(activeQuery, allowedTypes);
    const exportTypes = Object.entries(exportAllSelectedOptions).reduce((accum, [id, selected]) => {
      if (selected) {
        accum.push(id);
      }
      return accum;
    }, [] as string[]);

    const references = getTagFindReferences({ selectedTags, taggingApi });

    let blob;
    try {
      blob = await fetchExportByTypeAndSearch({
        http,
        search: queryText ? `${queryText}*` : undefined,
        types: exportTypes,
        references,
        includeReferencesDeep: isIncludeReferencesDeepChecked,
      });
    } catch (e) {
      notifications.toasts.addDanger({
        title: i18n.translate('savedObjectsManagement.objectsTable.export.toastErrorMessage', {
          defaultMessage: 'Unable to generate export: {error}',
          values: {
            error: e.body?.message ?? e,
          },
        }),
      });
      throw e;
    }

    saveAs(blob, 'export.ndjson');

    // this.showExportCompleteMessage(exportDetails);
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

  const checkboxOptions = [
    { id: 'filterBar', label: 'Filter bar', 'data-test-sub': 'filter-bar-embed' },
    { id: 'query', label: 'Query', 'data-test-sub': 'query-embed' },
    { id: 'timeFilter', label: 'Time filter', 'data-test-sub': 'time-filter-embed' },
    { id: 'topMenu', label: 'Top menu', 'data-test-sub': 'top-menu-embed' },
  ];

  const checkboxOnChangeHandler = (id: string): void => {
    setCheckboxIdSelectedMap((prev) => {
      return {
        ...prev,
        [id]: prev[id] ? !prev[id] : true,
      };
    });
  };

  const radioOptions = [
    { id: 'savedObject', label: 'Saved object' },
    { id: 'snapshot', label: 'Snapshot' },
  ];

  const placeholderEmbedCode = `Click copy icon to generate ${
    selectedRadio === 'savedObject' ? 'saved object' : 'snapshot'
  }`;


  return (
    <EuiModal onClose={onClose}>
      <I18nProvider>
        <EuiForm className="kbnShareContextMenu__finalPanel" data-test-subj="shareUrlForm">
          <EuiSpacer size="xs" />
          <EuiTitle>
            <EuiText>{`Share this ${props.objectType}`}</EuiText>
          </EuiTitle>
          <EuiSpacer size="m" />
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
                onChange={(id) => {
                  setSelectedRadio(id);
                }}
                name="embed radio group"
                idSelected={selectedRadio}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={1}>{allowShortUrl && renderShortUrlSwitch()}</EuiFlexItem>
            <EuiSpacer size="m" />
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiCodeBlock isCopyable>{placeholderEmbedCode}</EuiCodeBlock>
          <EuiSpacer size="m" />
          <EuiFlexGroup direction="row" justifyContent="flexEnd">
            <EuiButton fill onClick={onClose}>
              <FormattedMessage id="share.embed.doneButton" defaultMessage="Done" />
            </EuiButton>
          </EuiFlexGroup>
        </EuiForm>
      </I18nProvider>
    </EuiModal>
  );
};
