/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * The UI and related logic for the welcome screen that *should* show only
 * when it is enabled (the default) and there is no Kibana-consumed data
 * in Elasticsearch.
 */

import React from 'react';
import { EuiTitle, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPortal } from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';
import { FormattedMessage } from '@kbn/i18n-react';
import { getServices } from '../kibana_services';

import { SampleDataCard } from './sample_data';

interface Props {
  urlBasePath: string;
  onSkip: () => void;
}

/**
 * Shows a full-screen welcome page that gives helpful quick links to beginners.
 */
export class Welcome extends React.Component<Props> {
  private services = getServices();

  private hideOnEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.props.onSkip();
    }
  };

  private redirectToAddData() {
    this.services.application.navigateToApp('integrations', { path: '/browse' });
  }

  private onSampleDataDecline = () => {
    this.services.trackUiMetric(METRIC_TYPE.CLICK, 'sampleDataDecline');
    this.props.onSkip();
  };

  private onSampleDataConfirm = () => {
    this.services.trackUiMetric(METRIC_TYPE.CLICK, 'sampleDataConfirm');
    this.redirectToAddData();
  };

  componentDidMount() {
    const { welcomeService } = this.services;
    this.services.trackUiMetric(METRIC_TYPE.LOADED, 'welcomeScreenMount');
    document.addEventListener('keydown', this.hideOnEsc);
    welcomeService.onRendered();
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.hideOnEsc);
  }

  render() {
    const { urlBasePath } = this.props;
    const { welcomeService } = this.services;
    return (
      <EuiPortal>
        <div className="homWelcome" data-test-subj="homeWelcomeInterstitial">
          <header className="homWelcome__header">
            <div className="homWelcome__content eui-textCenter">
              <EuiSpacer size="xl" />
              <span className="homWelcome__logo">
                <EuiIcon type="logoElastic" size="xxl" />
              </span>
              <EuiTitle size="l" className="homWelcome__title">
                <h1>
                  <FormattedMessage id="home.welcomeTitle" defaultMessage="Welcome to Elastic" />
                </h1>
              </EuiTitle>
              <EuiSpacer size="m" />
            </div>
          </header>
          <div className="homWelcome__content homWelcome-body">
            <EuiFlexGroup gutterSize="l">
              <EuiFlexItem>
                <SampleDataCard
                  urlBasePath={urlBasePath}
                  onConfirm={this.onSampleDataConfirm}
                  onDecline={this.onSampleDataDecline}
                />
                <EuiSpacer size="s" />
                {welcomeService.renderTelemetryNotice()}
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        </div>
      </EuiPortal>
    );
  }
}
