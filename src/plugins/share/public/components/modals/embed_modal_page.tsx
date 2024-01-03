/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiForm,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCheckboxGroup,
  EuiButtonEmpty,
  EuiButton,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiRadioGroup,
  EuiSwitch,
  EuiSwitchEvent,
  EuiIconTip,
  EuiCopy,
} from '@elastic/eui';
import { Capabilities } from '@kbn/core-capabilities-common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import React, { Component } from 'react';
import { format as formatUrl, parse as parseUrl } from 'url';
import {
  LocatorPublic,
  AnonymousAccessServiceContract,
  AnonymousAccessState,
} from '../../../common';
import { UrlParamExtension, BrowserUrlService } from '../../types';

export interface EmbedModalProps {
  allowShortUrl: boolean;
  isEmbedded?: boolean;
  objectId?: string;
  objectType: string;
  shareableUrl?: string;
  shareableUrlForSavedObject?: string;
  shareableUrlLocatorParams?: {
    locator: LocatorPublic<any>;
    params: any;
  };
  urlParamExtensions?: UrlParamExtension[];
  anonymousAccess?: AnonymousAccessServiceContract;
  showPublicUrlSwitch?: (anonymousUserCapabilities: Capabilities) => boolean;
  urlService: BrowserUrlService;
  snapshotShareWarning?: string;
  onClose: () => void;
}

export enum ExportUrlAsType {
  EXPORT_URL_AS_SAVED_OBJECT = 'savedObject',
  EXPORT_URL_AS_SNAPSHOT = 'snapshot',
}

interface UrlParams {
  [extensionName: string]: {
    [queryParam: string]: boolean;
  };
}

interface State {
  exportUrlAs: ExportUrlAsType;
  useShortUrl: boolean;
  usePublicUrl: boolean;
  isCreatingShortUrl: boolean;
  url?: string;
  shortUrlErrorMsg?: string;
  urlParams?: UrlParams;
  anonymousAccessParameters: AnonymousAccessState['accessURLParameters'];
  showPublicUrlSwitch: boolean;
  showWarningButton: boolean;
  urlParamsSelectedMap: { [key: string]: boolean };
  selectedRadio: string;
}

export class EmbedModal extends Component<EmbedModalProps, State> {
  private mounted?: boolean;
  private shortUrlCache?: string;

  constructor(props: EmbedModalProps) {
    super(props);

    this.shortUrlCache = undefined;
    this.state = {
      exportUrlAs: ExportUrlAsType.EXPORT_URL_AS_SNAPSHOT,
      useShortUrl: false,
      usePublicUrl: false,
      isCreatingShortUrl: false,
      url: '',
      anonymousAccessParameters: null,
      showPublicUrlSwitch: false,
      showWarningButton: Boolean(this.props.snapshotShareWarning),
      urlParamsSelectedMap: {
        showFilterBar: true,
      },
      selectedRadio: 'savedObject',
    };
  }

  public componentWillUnmount() {
    window.removeEventListener('hashchange', this.resetUrl);

    this.mounted = false;
  }

  public componentDidMount() {
    this.mounted = true;
    this.setUrl();

    window.addEventListener('hashchange', this.resetUrl, false);

    if (this.props.anonymousAccess) {
      (async () => {
        const { accessURLParameters: anonymousAccessParameters } =
          await this.props.anonymousAccess!.getState();

        if (!this.mounted) {
          return;
        }

        if (!anonymousAccessParameters) {
          return;
        }

        let showPublicUrlSwitch: boolean = false;

        if (this.props.showPublicUrlSwitch) {
          const anonymousUserCapabilities = await this.props.anonymousAccess!.getCapabilities();

          if (!this.mounted) {
            return;
          }

          try {
            showPublicUrlSwitch = this.props.showPublicUrlSwitch!(anonymousUserCapabilities);
          } catch {
            showPublicUrlSwitch = false;
          }
        }

        this.setState({
          anonymousAccessParameters,
          showPublicUrlSwitch,
        });
      })();
    }
  }

  private isNotSaved = () => {
    return this.props.objectId === undefined || this.props.objectId === '';
  };

  private resetUrl = () => {
    if (this.mounted) {
      this.shortUrlCache = undefined;
      this.setState(
        {
          useShortUrl: false,
        },
        this.setUrl
      );
    }
  };
  private getUrlParamExtensions = (url: string): string => {
    const { urlParams } = this.state;
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

  private updateUrlParams = (url: string) => {
    url = this.props.isEmbedded ? this.makeUrlEmbeddable(url) : url;
    url = this.state.urlParams ? this.getUrlParamExtensions(url) : url;

    return url;
  };

  private getSnapshotUrl = (forSavedObject?: boolean) => {
    let url = '';
    if (forSavedObject && this.props.shareableUrlForSavedObject) {
      url = this.props.shareableUrlForSavedObject;
    }
    if (!url) {
      url = this.props.shareableUrl || window.location.href;
    }
    return this.updateUrlParams(url);
  };

  private getSavedObjectUrl = () => {
    if (this.isNotSaved()) {
      return;
    }

    const url = this.getSnapshotUrl(true);

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
    return this.updateUrlParams(formattedUrl);
  };

  private makeUrlEmbeddable = (url: string): string => {
    const embedParam = '?embed=true';
    const urlHasQueryString = url.indexOf('?') !== -1;

    if (urlHasQueryString) {
      return url.replace('?', `${embedParam}&`);
    }

    return `${url}${embedParam}`;
  };

  private addUrlAnonymousAccessParameters = (url: string): string => {
    if (!this.state.anonymousAccessParameters || !this.state.usePublicUrl) {
      return url;
    }

    const parsedUrl = new URL(url);

    for (const [name, value] of Object.entries(this.state.anonymousAccessParameters)) {
      parsedUrl.searchParams.set(name, value);
    }

    return parsedUrl.toString();
  };

  private makeIframeTag = (url?: string) => {
    if (!url) {
      return;
    }

    return `<iframe src="${url}" height="600" width="800"></iframe>`;
  };

  private setUrl = () => {
    let url: string | undefined;

    if (this.state.exportUrlAs === ExportUrlAsType.EXPORT_URL_AS_SAVED_OBJECT) {
      url = this.getSavedObjectUrl();
    } else if (this.state.useShortUrl) {
      url = this.shortUrlCache;
    } else {
      url = this.getSnapshotUrl();
    }

    if (url) {
      url = this.addUrlAnonymousAccessParameters(url);
    }

    if (this.props.isEmbedded) {
      url = this.makeIframeTag(url);
    }

    this.setState({ url });
  };

  private handleShortUrlChange = async (evt: EuiSwitchEvent) => {
    const isChecked = evt.target.checked;

    if (!isChecked || this.shortUrlCache !== undefined) {
      this.setState({ useShortUrl: isChecked }, this.setUrl);
      return;
    }

    // "Use short URL" is checked but shortUrl has not been generated yet so one needs to be created.
    this.createShortUrl();
  };

  private createShortUrl = async () => {
    this.setState({
      isCreatingShortUrl: true,
      shortUrlErrorMsg: undefined,
    });

    try {
      const { shareableUrlLocatorParams } = this.props;
      if (shareableUrlLocatorParams) {
        const shortUrls = this.props.urlService.shortUrls.get(null);
        const shortUrl = await shortUrls.createWithLocator(shareableUrlLocatorParams);
        this.shortUrlCache = await shortUrl.locator.getUrl(shortUrl.params, { absolute: true });
      } else {
        const snapshotUrl = this.getSnapshotUrl();
        const shortUrl = await this.props.urlService.shortUrls
          .get(null)
          .createFromLongUrl(snapshotUrl);
        this.shortUrlCache = shortUrl.url;
      }

      if (!this.mounted) {
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
      if (!this.mounted) {
        return;
      }

      this.shortUrlCache = undefined;
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

  private renderShortUrlSwitch = () => {
    if (
      this.state.exportUrlAs === ExportUrlAsType.EXPORT_URL_AS_SAVED_OBJECT ||
      !this.props.allowShortUrl
    ) {
      return null;
    }
    const shortUrlLabel = (
      <FormattedMessage id="share.urlPanel.shortUrlLabel" defaultMessage="Short URL" />
    );

    const switchLabel = this.state.isCreatingShortUrl ? (
      <span>
        <EuiLoadingSpinner size="s" /> {shortUrlLabel}
      </span>
    ) : (
      shortUrlLabel
    );

    const switchComponent = (
      <EuiSwitch
        label={switchLabel}
        checked={this.state.useShortUrl}
        onChange={this.handleShortUrlChange}
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
      <EuiFormRow helpText={this.state.shortUrlErrorMsg} data-test-subj="createShortUrl">
        {this.renderWithIconTip(switchComponent, tipContent)}
      </EuiFormRow>
    );
  };

  private handleExportUrlAs = (optionId: string) => {
    this.setState(
      {
        showWarningButton:
          Boolean(this.props.snapshotShareWarning) &&
          (optionId as ExportUrlAsType) === ExportUrlAsType.EXPORT_URL_AS_SNAPSHOT,
        exportUrlAs: optionId as ExportUrlAsType,
      },
      this.setUrl
    );
  };

  private renderWithIconTip = (child: React.ReactNode, tipContent: React.ReactNode) => {
    return (
      <EuiFlexGroup gutterSize="none" responsive={false}>
        <EuiFlexItem grow={false}>{child}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip content={tipContent} position="bottom" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  public render() {
    const dashboardUrlParams = {
      showTopMenu: 'show-top-menu',
      showQueryInput: 'show-query-input',
      showTimeFilter: 'show-time-filter',
      hideFilterBar: 'hide-filter-bar',
    };
    const showFilterBarId = 'showFilterBar';
    const shareModalStrings = {
      getTopMenuCheckbox: () =>
        i18n.translate('dashboard.embedUrlParamExtension.topMenu', {
          defaultMessage: 'Top menu',
        }),
      getQueryCheckbox: () =>
        i18n.translate('dashboard.embedUrlParamExtension.query', {
          defaultMessage: 'Query',
        }),
      getTimeFilterCheckbox: () =>
        i18n.translate('dashboard.embedUrlParamExtension.timeFilter', {
          defaultMessage: 'Time filter',
        }),
      getFilterBarCheckbox: () =>
        i18n.translate('dashboard.embedUrlParamExtension.filterBar', {
          defaultMessage: 'Filter bar',
        }),
      getCheckboxLegend: () =>
        i18n.translate('dashboard.embedUrlParamExtension.include', {
          defaultMessage: 'Include',
        }),
      getSnapshotShareWarning: () =>
        i18n.translate('dashboard.snapshotShare.longUrlWarning', {
          defaultMessage:
            'One or more panels on this dashboard have changed. Before you generate a snapshot, save the dashboard.',
        }),
    };
    const checkboxes = [
      {
        id: dashboardUrlParams.showTopMenu,
        label: shareModalStrings.getTopMenuCheckbox(),
      },
      {
        id: dashboardUrlParams.showQueryInput,
        label: shareModalStrings.getQueryCheckbox(),
      },
      {
        id: dashboardUrlParams.showTimeFilter,
        label: shareModalStrings.getTimeFilterCheckbox(),
      },
      {
        id: showFilterBarId,
        label: shareModalStrings.getFilterBarCheckbox(),
      },
    ];

    const handleChange = (param: string): void => {
      const newSelectedMap = {
        ...this.state.urlParamsSelectedMap,
        [param]: !this.state.urlParamsSelectedMap[param],
      };
      this.setState({ urlParamsSelectedMap: newSelectedMap });
    };

    const radioOptions = [
      { id: 'savedObject', label: 'Saved object' },
      { id: 'snapshot', label: 'Snapshot' },
    ];

    return (
      <EuiModal maxWidth={false} onClose={this.props.onClose}>
        <I18nProvider>
          <EuiModalHeader>
            <EuiModalHeaderTitle>{`Embed this ${this.props.objectType}`}</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiForm className="kbnShareContextMenu__finalPanel" data-test-subj="shareUrlForm">
              <EuiFlexGroup direction="column">
                <EuiFlexItem grow={1}>
                  <EuiCheckboxGroup
                    options={checkboxes}
                    idToSelectedMap={this.state.urlParamsSelectedMap}
                    onChange={handleChange}
                    legend={{
                      children: shareModalStrings.getCheckboxLegend(),
                    }}
                    data-test-subj="embedUrlParamExtension"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={0}>
                  <EuiRadioGroup
                    options={radioOptions}
                    onChange={this.handleExportUrlAs}
                    name="embed radio group"
                    idSelected={this.state.exportUrlAs}
                    legend={{
                      children: <span>Generate as</span>,
                    }}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiForm>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem>{this.props.allowShortUrl && this.renderShortUrlSwitch()}</EuiFlexItem>
              <EuiFlexItem grow={0}>
                <EuiFlexGroup gutterSize="m">
                  <EuiFlexItem>
                    <EuiButtonEmpty onClick={this.props.onClose}>
                      <FormattedMessage id="share.embed.doneButton" defaultMessage="Done" />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiCopy textToCopy={this.state.url ?? ''}>
                      {(copy) => (
                        <EuiButton fill onClick={copy}>
                          <FormattedMessage
                            id="share.embed.embedButton"
                            defaultMessage="Copy Embed"
                          />
                        </EuiButton>
                      )}
                    </EuiCopy>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiModalFooter>
        </I18nProvider>
      </EuiModal>
    );
  }
}
