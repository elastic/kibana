/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/*
 * The UI and related logic for the welcome screen that *should* show only
 * when it is enabled (the default) and there is no Kibana-consumed data
 * in Elasticsearch.
 */

import React from 'react';
import {
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiIcon,
  EuiPortal,
} from '@elastic/eui';
// @ts-ignore
import { banners } from 'ui/notify';

import { FormattedMessage } from '@kbn/i18n/react';
import chrome from 'ui/chrome';
import { SampleDataCard } from './sample_data';
import { TelemetryOptInCard } from './telemetry_opt_in';
// @ts-ignore
import { trackUiMetric, METRIC_TYPE } from '../kibana_services';

interface Props {
  urlBasePath: string;
  onSkip: () => {};
  fetchTelemetry: () => Promise<any[]>;
  setOptIn: (enabled: boolean) => Promise<boolean>;
  getTelemetryBannerId: () => string;
  shouldShowTelemetryOptIn: boolean;
}
interface State {
  step: number;
}

/**
 * Shows a full-screen welcome page that gives helpful quick links to beginners.
 */
export class Welcome extends React.PureComponent<Props, State> {
  public readonly state: State = {
    step: 0,
  };

  private hideOnEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.props.onSkip();
    }
  };

  private redirecToSampleData() {
    const path = chrome.addBasePath('#/home/tutorial_directory/sampleData');
    window.location.href = path;
  }
  private async handleTelemetrySelection(confirm: boolean) {
    const metricName = `telemetryOptIn${confirm ? 'Confirm' : 'Decline'}`;
    trackUiMetric(METRIC_TYPE.CLICK, metricName);
    await this.props.setOptIn(confirm);
    const bannerId = this.props.getTelemetryBannerId();
    banners.remove(bannerId);
    this.setState(() => ({ step: 1 }));
  }

  private onSampleDataDecline = () => {
    trackUiMetric(METRIC_TYPE.CLICK, 'sampleDataDecline');
    this.props.onSkip();
  };
  private onSampleDataConfirm = () => {
    trackUiMetric(METRIC_TYPE.CLICK, 'sampleDataConfirm');
    this.redirecToSampleData();
  };

  componentDidMount() {
    trackUiMetric(METRIC_TYPE.LOADED, 'welcomeScreenMount');
    if (this.props.shouldShowTelemetryOptIn) {
      trackUiMetric(METRIC_TYPE.COUNT, 'welcomeScreenWithTelemetryOptIn');
    }
    document.addEventListener('keydown', this.hideOnEsc);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.hideOnEsc);
  }

  render() {
    const { urlBasePath, shouldShowTelemetryOptIn, fetchTelemetry } = this.props;
    const { step } = this.state;

    return (
      <EuiPortal>
        <div className="homWelcome">
          <header className="homWelcome__header">
            <div className="homWelcome__content eui-textCenter">
              <EuiSpacer size="xl" />
              <span className="homWelcome__logo">
                <EuiIcon type="logoKibana" size="xxl" />
              </span>
              <EuiTitle size="l" className="homWelcome__title">
                <h1>
                  <FormattedMessage id="kbn.home.welcomeTitle" defaultMessage="Welcome to Kibana" />
                </h1>
              </EuiTitle>
              <EuiText size="s" color="subdued" className="homWelcome__subtitle">
                <p>
                  <FormattedMessage
                    id="kbn.home.welcomeDescription"
                    defaultMessage="Your window into the Elastic Stack"
                  />
                </p>
              </EuiText>
              <EuiSpacer size="m" />
            </div>
          </header>
          <div className="homWelcome__content homWelcome-body">
            <EuiFlexGroup gutterSize="l">
              <EuiFlexItem>
                {shouldShowTelemetryOptIn && step === 0 && (
                  <TelemetryOptInCard
                    urlBasePath={urlBasePath}
                    fetchTelemetry={fetchTelemetry}
                    onConfirm={this.handleTelemetrySelection.bind(this, true)}
                    onDecline={this.handleTelemetrySelection.bind(this, false)}
                  />
                )}
                {(!shouldShowTelemetryOptIn || step === 1) && (
                  <SampleDataCard
                    urlBasePath={urlBasePath}
                    onConfirm={this.onSampleDataConfirm}
                    onDecline={this.onSampleDataDecline}
                  />
                )}
                <EuiSpacer size="xs" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        </div>
      </EuiPortal>
    );
  }
}
