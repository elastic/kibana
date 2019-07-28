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
  EuiButtonIcon,
  EuiPortal,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import chrome from 'ui/chrome';
import { SampleDataCard } from './sample_data';
import { TelemetryOptInCard } from './telemetry_opt_in';

interface Props {
  urlBasePath: string;
  onSkip: () => {};
  fetchTelemetry: () => Promise<any[]>;
}
interface State {
  step: number;
  trySampleData: boolean;
}

/**
 * Shows a full-screen welcome page that gives helpful quick links to beginners.
 */
export class Welcome extends React.PureComponent<Props, State> {
  public readonly state: State = {
    step: 0,
    trySampleData: false,
  };

  hideOnEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.props.onSkip();
    }
  };

  goToStep = (step: number) => () => {
    this.setState(() => ({ step }));
  };

  private redirecToSampleData() {
    const path = chrome.addBasePath('#/home/tutorial_directory/sampleData');
    window.location.href = path;
  }
  onTelemetryOptInDecline = () => {
    const { trySampleData } = this.state;
    if (trySampleData) {
      return this.redirecToSampleData();
    }
    this.props.onSkip();
  };
  onTelemetryOptInConfirm = () => {
    const { trySampleData } = this.state;
    if (trySampleData) {
      return this.redirecToSampleData();
    }
    this.props.onSkip();
  };

  onSampleDataDecline = () => {
    this.setState(() => ({ step: 1, trySampleData: false }));
  };
  onSampleDataConfirm = () => {
    this.setState(() => ({ step: 1, trySampleData: true }));
  };

  componentDidMount() {
    document.addEventListener('keydown', this.hideOnEsc);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.hideOnEsc);
  }

  render() {
    const { urlBasePath, fetchTelemetry } = this.props;
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
                {step === 0 && (
                  <SampleDataCard
                    urlBasePath={urlBasePath}
                    onConfirm={this.onSampleDataConfirm}
                    onDecline={this.onSampleDataDecline}
                  />
                )}
                {step === 1 && (
                  <TelemetryOptInCard
                    fetchTelemetry={fetchTelemetry}
                    urlBasePath={urlBasePath}
                    onConfirm={this.onTelemetryOptInConfirm}
                    onDecline={this.onTelemetryOptInDecline}
                  />
                )}
                <EuiSpacer size="xs" />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexGroup gutterSize="s" justifyContent="center">
              {[0, 1].map(stepOpt => (
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="dot"
                    onClick={this.goToStep(stepOpt)}
                    size="s"
                    fill-opacity={step === stepOpt ? 1 : 0.5}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </div>
        </div>
      </EuiPortal>
    );
  }
}
