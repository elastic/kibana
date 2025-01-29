/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Component, ReactElement } from 'react';
import * as Rx from 'rxjs';

import { CSV_REPORT_TYPE, CSV_REPORT_TYPE_V2 } from '@kbn/reporting-export-types-csv-common';
import { PDF_REPORT_TYPE_V2 } from '@kbn/reporting-export-types-pdf-common';
import { PNG_REPORT_TYPE_V2 } from '@kbn/reporting-export-types-png-common';

import {
  EuiAccordion,
  EuiButton,
  EuiCopy,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { BaseParams } from '@kbn/reporting-common/types';

import type { StartServices } from '../..';
import type { ReportingAPIClient } from '../../../reporting_api_client';
import { ErrorUnsavedWorkPanel, ErrorUrlTooLongPanel } from './components';
import { getMaxUrlLength } from './constants';

/**
 * Properties for displaying a share menu with Reporting features, including
 * internally-derived fields.
 */
export interface ReportingPanelProps {
  apiClient: ReportingAPIClient;
  reportType: string;

  requiresSavedState: boolean; // Whether the report to be generated requires saved state that is not captured in the URL submitted to the report generator.
  layoutId?: string;
  objectId?: string;

  getJobParams: (forShareUrl?: boolean) => Omit<BaseParams, 'browserTimezone' | 'version'>;

  options?: ReactElement | null;
  isDirty?: boolean;
  onClose?: () => void;

  startServices$: Rx.Observable<StartServices>;
}

export type Props = ReportingPanelProps & { intl: InjectedIntl };

interface State {
  isStale: boolean;
  absoluteUrl: string;
  layoutId: string;
  objectType: string;
  isCreatingReportJob: boolean;
}

class ReportingPanelContentUi extends Component<Props, State> {
  private mounted?: boolean;

  constructor(props: Props) {
    super(props);

    // Get objectType from job params
    const { objectType } = props.getJobParams();

    this.state = {
      isStale: false,
      absoluteUrl: this.getAbsoluteReportGenerationUrl(props),
      layoutId: '',
      objectType,
      isCreatingReportJob: false,
    };
  }

  private getAbsoluteReportGenerationUrl = (props: Props) => {
    const relativePath = this.props.apiClient.getReportingPublicJobPath(
      props.reportType,
      this.props.apiClient.getDecoratedJobParams(this.props.getJobParams(true))
    );
    return new URL(relativePath, window.location.href).toString();
  };

  public componentDidUpdate(_prevProps: Props, prevState: State) {
    if (this.props.layoutId && this.props.layoutId !== prevState.layoutId) {
      this.setState({
        ...prevState,
        absoluteUrl: this.getAbsoluteReportGenerationUrl(this.props),
        layoutId: this.props.layoutId,
      });
    }
  }

  public componentWillUnmount() {
    window.removeEventListener('hashchange', this.markAsStale);
    window.removeEventListener('resize', this.setAbsoluteReportGenerationUrl);

    this.mounted = false;
  }

  public componentDidMount() {
    this.mounted = true;

    window.addEventListener('hashchange', this.markAsStale, false);
    window.addEventListener('resize', this.setAbsoluteReportGenerationUrl);
  }

  private isNotSaved = () => {
    return this.props.objectId === undefined || this.props.objectId === '';
  };

  private renderCopyURLButton({
    isUnsaved,
    exceedsMaxLength,
  }: {
    isUnsaved: boolean;
    exceedsMaxLength: boolean;
  }) {
    if (isUnsaved) {
      if (exceedsMaxLength) {
        return <ErrorUrlTooLongPanel isUnsaved />;
      }
      return <ErrorUnsavedWorkPanel />;
    } else if (exceedsMaxLength) {
      return <ErrorUrlTooLongPanel isUnsaved={false} />;
    }
    return (
      <EuiCopy textToCopy={this.state.absoluteUrl} anchorClassName="eui-displayBlock">
        {(copy) => (
          <EuiButton
            color={isUnsaved ? 'warning' : 'primary'}
            fullWidth
            onClick={copy}
            size="s"
            data-test-subj="shareReportingCopyURL"
          >
            <FormattedMessage
              id="reporting.share.panelContent.copyUrlButtonLabel"
              defaultMessage="Copy POST URL"
            />
          </EuiButton>
        )}
      </EuiCopy>
    );
  }

  public render() {
    const isUnsaved: boolean = this.isNotSaved() || this.props.isDirty || this.state.isStale;

    if (this.props.requiresSavedState && isUnsaved) {
      return (
        <EuiForm className="kbnShareContextMenu__finalPanel" data-test-subj="shareReportingForm">
          <EuiFormRow
            helpText={
              <FormattedMessage
                id="reporting.share.panelContent.saveWorkDescription"
                defaultMessage="Please save your work before generating a report."
              />
            }
          >
            {this.renderGenerateReportButton(true)}
          </EuiFormRow>
        </EuiForm>
      );
    }

    const exceedsMaxLength = this.state.absoluteUrl.length >= getMaxUrlLength();

    return (
      <EuiForm className="kbnShareContextMenu__finalPanel" data-test-subj="shareReportingForm">
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="reporting.share.panelContent.generationTimeDescription"
              defaultMessage="{reportingType}s can take a minute or two to generate based upon the size of your {objectType}."
              description="Here 'reportingType' can be 'PDF' or 'CSV'"
              values={{
                reportingType: this.prettyPrintReportingType(),
                objectType: this.state.objectType,
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="s" />

        {this.props.options}

        {this.renderGenerateReportButton(false)}

        <EuiHorizontalRule
          margin="s"
          style={{ width: 'auto', marginLeft: '-16px', marginRight: '-16px' }}
        />

        <EuiAccordion
          id="advanced-options"
          buttonContent={i18n.translate('reporting.share.panelContent.advancedOptions', {
            defaultMessage: 'Advanced options',
          })}
          paddingSize="none"
          data-test-subj="shareReportingAdvancedOptionsButton"
        >
          <EuiSpacer size="s" />
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="reporting.share.panelContent.howToCallGenerationDescription"
                defaultMessage="Alternatively, copy this POST URL to call generation from outside Kibana or from Watcher."
              />
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          {this.renderCopyURLButton({ isUnsaved, exceedsMaxLength })}
        </EuiAccordion>
      </EuiForm>
    );
  }

  private renderGenerateReportButton = (isDisabled: boolean) => {
    return (
      <EuiButton
        disabled={isDisabled || this.state.isCreatingReportJob}
        fullWidth
        fill
        onClick={this.createReportingJob}
        data-test-subj="generateReportButton"
        size="s"
        isLoading={this.state.isCreatingReportJob}
      >
        <FormattedMessage
          id="reporting.share.panelContent.generateButtonLabel"
          defaultMessage="Generate {reportingType}"
          values={{ reportingType: this.prettyPrintReportingType() }}
        />
      </EuiButton>
    );
  };

  private prettyPrintReportingType = () => {
    switch (this.props.reportType) {
      case 'pdf':
      case PDF_REPORT_TYPE_V2:
        return 'PDF';
      case 'csv':
      case CSV_REPORT_TYPE:
      case CSV_REPORT_TYPE_V2:
        return 'CSV';
      case 'png':
      case PNG_REPORT_TYPE_V2:
        return 'PNG';
      default:
        return this.props.reportType;
    }
  };

  private markAsStale = () => {
    if (!this.mounted) {
      return;
    }

    this.setState({ isStale: true });
  };

  private setAbsoluteReportGenerationUrl = () => {
    if (!this.mounted) {
      return;
    }
    const absoluteUrl = this.getAbsoluteReportGenerationUrl(this.props);
    this.setState({ absoluteUrl });
  };

  private createReportingJob = async () => {
    const { startServices$, apiClient, intl } = this.props;
    const [coreStart] = await Rx.firstValueFrom(startServices$);
    const decoratedJobParams = apiClient.getDecoratedJobParams(this.props.getJobParams());
    const { toasts } = coreStart.notifications;

    this.setState({ isCreatingReportJob: true });

    try {
      await this.props.apiClient.createReportingJob(this.props.reportType, decoratedJobParams);
      toasts.addSuccess({
        title: intl.formatMessage(
          {
            id: 'reporting.share.panelContent.successfullyQueuedReportNotificationTitle',
            defaultMessage: 'Queued report for {objectType}',
          },
          { objectType: this.state.objectType }
        ),
        text: toMountPoint(
          <FormattedMessage
            id="reporting.share.panelContent.successfullyQueuedReportNotificationDescription"
            defaultMessage="Track its progress in {path}."
            values={{
              path: (
                <a href={this.props.apiClient.getManagementLink()}>
                  <FormattedMessage
                    id="reporting.share.publicNotifier.reportLink.reportingSectionUrlLinkLabel"
                    defaultMessage="Stack Management &gt; Reporting"
                  />
                </a>
              ),
            }}
          />,
          coreStart
        ),
        'data-test-subj': 'queueReportSuccess',
      });
      if (this.props.onClose) {
        this.props.onClose();
      }
      if (this.mounted) {
        this.setState({ isCreatingReportJob: false });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      toasts.addError(error, {
        title: intl.formatMessage({
          id: 'reporting.share.panelContent.notification.reportingErrorTitle',
          defaultMessage: 'Unable to create report',
        }),
        toastMessage: intl.formatMessage({
          id: 'reporting.share.panelContent.notification.reportingErrorToastMessage',
          defaultMessage: `We couldn't create a report at this time.`,
        }),
      });
      if (this.mounted) {
        this.setState({ isCreatingReportJob: false });
      }
    }
  };
}

export const ReportingPanelContent = injectI18n(ReportingPanelContentUi);
