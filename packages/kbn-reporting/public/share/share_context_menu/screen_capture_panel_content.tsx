/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFormRow, EuiSwitch, EuiSwitchEvent } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n-react';
import React, { Component } from 'react';
import type { LayoutParams } from '@kbn/screenshotting-plugin/common';
import { PDF_JOB_TYPE_V2 } from '@kbn/reporting-export-types-pdf-common';
import { ReportingPanelContent, ReportingPanelProps } from './reporting_panel_content';

export type Props = ReportingPanelProps & { intl: InjectedIntl };
interface State {
  useCanvasLayout: boolean;
}

export class ScreenCapturePanelContentUi extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
  }

  public render() {
    return (
      <ReportingPanelContent
        layoutId={this.getLayout().id}
        getJobParams={this.getJobParams}
        options={this.renderOptions()}
        apiClient={this.props.apiClient}
        toasts={this.props.toasts}
        uiSettings={this.props.uiSettings}
        theme={this.props.theme}
        requiresSavedState={false}
        reportType={PDF_JOB_TYPE_V2}
      />
    );
  }

  private renderOptions = () => {
    return (
      <EuiFormRow
        helpText={
          <FormattedMessage
            id="reporting.share.screenCapturePanelContent.canvasLayoutHelpText"
            defaultMessage="Remove borders and footer logo"
          />
        }
      >
        <EuiSwitch
          label={
            <FormattedMessage
              id="reporting.share.screenCapturePanelContent.canvasLayoutLabel"
              defaultMessage="Full page layout"
            />
          }
          checked={this.state.useCanvasLayout}
          onChange={this.handleCanvasLayoutChange}
          data-test-subj="reportModeToggle"
        />
      </EuiFormRow>
    );
  };

  private handleCanvasLayoutChange = (evt: EuiSwitchEvent) => {
    this.setState({ useCanvasLayout: evt.target.checked });
  };

  private getLayout = (): LayoutParams => {
    const { layout: outerLayout } = this.props.getJobParams();

    let dimensions = outerLayout?.dimensions;
    if (!dimensions) {
      const el = document.querySelector('[data-shared-items-container]');
      const { height, width } = el ? el.getBoundingClientRect() : { height: 768, width: 1024 };
      dimensions = { height, width };
    }

    return { id: 'canvas', dimensions };
  };

  private getJobParams = () => {
    return {
      ...this.props.getJobParams(),
      layout: this.getLayout(),
    };
  };
}

export const ScreenCapturePanelContent = injectI18n(ScreenCapturePanelContentUi);
