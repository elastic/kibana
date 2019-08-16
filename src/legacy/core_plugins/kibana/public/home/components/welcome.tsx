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
  showTelemetryOptIn: boolean;
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

  hideOnEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.props.onSkip();
    }
  };

  navigateToStep = (step: number) => () => {
    trackUiMetric(METRIC_TYPE.CLICK, `welcomeScreenNavigate_${step}`);
    this.setState(() => ({ step }));
  };

  private redirecToSampleData() {
    const path = chrome.addBasePath('#/home/tutorial_directory/sampleData');
    window.location.href = path;
  }
  onTelemetryOptInDecline = async () => {
    trackUiMetric(METRIC_TYPE.CLICK, 'telemetryOptInDecline');
    this.setState(() => ({ step: 1 }));
    await this.props.setOptIn(false);
  };
  onTelemetryOptInConfirm = async () => {
    trackUiMetric(METRIC_TYPE.CLICK, 'telemetryOptInConfirm');
    this.setState(() => ({ step: 1 }));
    await this.props.setOptIn(true);
  };

  onSampleDataDecline = () => {
    trackUiMetric(METRIC_TYPE.CLICK, 'sampleDataDecline');
    this.props.onSkip();
  };
  onSampleDataConfirm = () => {
    trackUiMetric(METRIC_TYPE.CLICK, 'sampleDataConfirm');
    this.redirecToSampleData();
  };

  componentDidMount() {
    trackUiMetric(METRIC_TYPE.LOADED, 'welcomeScreenMount');
    if (this.props.showTelemetryOptIn) {
      trackUiMetric(METRIC_TYPE.COUNT, 'welcomeScreenWithTelemetryOptIn');
    }
    document.addEventListener('keydown', this.hideOnEsc);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.hideOnEsc);
  }

  render() {
    const { urlBasePath, showTelemetryOptIn, fetchTelemetry } = this.props;
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
                {showTelemetryOptIn && step === 0 && (
                  <TelemetryOptInCard
                    urlBasePath={urlBasePath}
                    fetchTelemetry={fetchTelemetry}
                    onConfirm={this.onTelemetryOptInConfirm}
                    onDecline={this.onTelemetryOptInDecline}
                  />
                )}
                {(!showTelemetryOptIn || step === 1) && (
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
