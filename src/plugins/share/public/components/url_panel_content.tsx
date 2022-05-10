/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component, ReactElement } from 'react';
import {
  EuiButton,
  EuiCopy,
  EuiFlexGroup,
  EuiSpacer,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiRadioGroup,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';

import { format as formatUrl, parse as parseUrl } from 'url';

import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { Capabilities } from '@kbn/core/public';

import { UrlParamExtension } from '../types';
import {
  AnonymousAccessServiceContract,
  AnonymousAccessState,
} from '../../common/anonymous_access';
import type { BrowserUrlService } from '../types';

export interface UrlPanelContentProps {
  allowShortUrl: boolean;
  isEmbedded?: boolean;
  objectId?: string;
  objectType: string;
  shareableUrl?: string;
  urlParamExtensions?: UrlParamExtension[];
  anonymousAccess?: AnonymousAccessServiceContract;
  showPublicUrlSwitch?: (anonymousUserCapabilities: Capabilities) => boolean;
  urlService: BrowserUrlService;
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
}

export class UrlPanelContent extends Component<UrlPanelContentProps, State> {
  private mounted?: boolean;
  private shortUrlCache?: string;

  constructor(props: UrlPanelContentProps) {
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

  public render() {
    const shortUrlSwitch = this.renderShortUrlSwitch();
    const publicUrlSwitch = this.renderPublicUrlSwitch();

    const urlRow = (!!shortUrlSwitch || !!publicUrlSwitch) && (
      <EuiFormRow
        label={<FormattedMessage id="share.urlPanel.urlGroupTitle" defaultMessage="URL" />}
      >
        <>
          <EuiSpacer size={'s'} />
          {shortUrlSwitch}
          {publicUrlSwitch}
        </>
      </EuiFormRow>
    );

    return (
      <I18nProvider>
        <EuiForm className="kbnShareContextMenu__finalPanel" data-test-subj="shareUrlForm">
          {this.renderExportAsRadioGroup()}
          {this.renderUrlParamExtensions()}
          {urlRow}

          <EuiSpacer size="m" />

          <EuiCopy textToCopy={this.state.url || ''} anchorClassName="eui-displayBlock">
            {(copy: () => void) => (
              <EuiButton
                fill
                fullWidth
                onClick={copy}
                disabled={this.state.isCreatingShortUrl || this.state.url === ''}
                data-share-url={this.state.url}
                data-test-subj="copyShareUrlButton"
                size="s"
              >
                {this.props.isEmbedded ? (
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
        </EuiForm>
      </I18nProvider>
    );
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

  private updateUrlParams = (url: string) => {
    url = this.props.isEmbedded ? this.makeUrlEmbeddable(url) : url;
    url = this.state.urlParams ? this.getUrlParamExtensions(url) : url;

    return url;
  };

  private getSavedObjectUrl = () => {
    if (this.isNotSaved()) {
      return;
    }

    const url = this.getSnapshotUrl();

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

  private getSnapshotUrl = () => {
    const url = this.props.shareableUrl || window.location.href;

    return this.updateUrlParams(url);
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

  private handleExportUrlAs = (optionId: string) => {
    this.setState(
      {
        exportUrlAs: optionId as ExportUrlAsType,
      },
      this.setUrl
    );
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

  private handlePublicUrlChange = () => {
    this.setState(({ usePublicUrl }) => {
      return {
        usePublicUrl: !usePublicUrl,
      };
    }, this.setUrl);
  };

  private createShortUrl = async () => {
    this.setState({
      isCreatingShortUrl: true,
      shortUrlErrorMsg: undefined,
    });

    try {
      const snapshotUrl = this.getSnapshotUrl();
      const shortUrl = await this.props.urlService.shortUrls
        .get(null)
        .createFromLongUrl(snapshotUrl);

      if (!this.mounted) {
        return;
      }

      this.shortUrlCache = shortUrl.url;
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

  private renderExportUrlAsOptions = () => {
    return [
      {
        id: ExportUrlAsType.EXPORT_URL_AS_SNAPSHOT,
        label: this.renderWithIconTip(
          <FormattedMessage id="share.urlPanel.snapshotLabel" defaultMessage="Snapshot" />,
          <FormattedMessage
            id="share.urlPanel.snapshotDescription"
            defaultMessage="Snapshot URLs encode the current state of the {objectType} in the URL itself.
            Edits to the saved {objectType} won't be visible via this URL."
            values={{ objectType: this.props.objectType }}
          />
        ),
        ['data-test-subj']: 'exportAsSnapshot',
      },
      {
        id: ExportUrlAsType.EXPORT_URL_AS_SAVED_OBJECT,
        disabled: this.isNotSaved(),
        label: this.renderWithIconTip(
          <FormattedMessage id="share.urlPanel.savedObjectLabel" defaultMessage="Saved object" />,
          <FormattedMessage
            id="share.urlPanel.savedObjectDescription"
            defaultMessage="You can share this URL with people to let them load the most recent saved version of this {objectType}."
            values={{ objectType: this.props.objectType }}
          />
        ),
        ['data-test-subj']: 'exportAsSavedObject',
      },
    ];
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

  private renderExportAsRadioGroup = () => {
    const generateLinkAsHelp = this.isNotSaved() ? (
      <FormattedMessage
        id="share.urlPanel.canNotShareAsSavedObjectHelpText"
        defaultMessage="Can't share as saved object until the {objectType} has been saved."
        values={{ objectType: this.props.objectType }}
      />
    ) : undefined;
    return (
      <EuiFormRow helpText={generateLinkAsHelp}>
        <EuiRadioGroup
          options={this.renderExportUrlAsOptions()}
          idSelected={this.state.exportUrlAs}
          onChange={this.handleExportUrlAs}
          legend={{
            children: (
              <FormattedMessage
                id="share.urlPanel.generateLinkAsLabel"
                defaultMessage="Generate the link as"
              />
            ),
          }}
        />
      </EuiFormRow>
    );
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

  private renderPublicUrlSwitch = () => {
    if (!this.state.anonymousAccessParameters || !this.state.showPublicUrlSwitch) {
      return null;
    }

    const switchLabel = (
      <FormattedMessage id="share.urlPanel.publicUrlLabel" defaultMessage="Public URL" />
    );
    const switchComponent = (
      <EuiSwitch
        label={switchLabel}
        checked={this.state.usePublicUrl}
        onChange={this.handlePublicUrlChange}
        data-test-subj="usePublicUrl"
      />
    );
    const tipContent = (
      <FormattedMessage
        id="share.urlPanel.publicUrlHelpText"
        defaultMessage="Use public URL to share with anyone. It enables one-step anonymous access by removing the login prompt."
      />
    );

    return (
      <EuiFormRow data-test-subj="createPublicUrl">
        {this.renderWithIconTip(switchComponent, tipContent)}
      </EuiFormRow>
    );
  };

  private renderUrlParamExtensions = (): ReactElement | void => {
    if (!this.props.urlParamExtensions) {
      return;
    }

    const setParamValue =
      (paramName: string) =>
      (values: { [queryParam: string]: boolean } = {}): void => {
        const stateUpdate = {
          urlParams: {
            ...this.state.urlParams,
            [paramName]: {
              ...values,
            },
          },
        };
        this.setState(stateUpdate, this.state.useShortUrl ? this.createShortUrl : this.setUrl);
      };

    return (
      <React.Fragment>
        {this.props.urlParamExtensions.map(({ paramName, component: UrlParamComponent }) => (
          <EuiFormRow key={paramName}>
            <UrlParamComponent setParamValue={setParamValue(paramName)} />
          </EuiFormRow>
        ))}
      </React.Fragment>
    );
  };
}
