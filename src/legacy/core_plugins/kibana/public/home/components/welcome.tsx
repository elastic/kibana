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
  EuiCard,
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiIcon,
  EuiButton,
  EuiButtonEmpty,
  EuiPortal,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { SampleDataCard } from './sample_data';
import { TelemetryOptInCard } from './telemetry_opt_in';
import chrome from 'ui/chrome';

interface Props {
  urlBasePath: string;
  onSkip: () => {};
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

  onTelemetryOptInDecline = () => {
    const { trySampleData } = this.state;
    if (trySampleData) {
      chrome.addBasePath()
      // getRouteHref: (obj, route) => $scope.kbnUrl.getRouteHref(obj, route),
    } else {
      this.props.onSkip();
    }
  }
  onTelemetryOptInConfirm = () => {

  }

  onSampleDataDecline = () => {
    this.setState(() => ({ step: 1, trySampleData: false }))
  }
  onSampleDataConfirm = () => {
    this.setState(() => ({ step: 1, trySampleData: true }))
  }

  componentDidMount() {
    document.addEventListener('keydown', this.hideOnEsc);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.hideOnEsc);
  }

  render() {
    const { urlBasePath } = this.props;
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
                  <FormattedMessage id="kbn.home.welcomeTitle" defaultMessage="Welcome to Kibana"/>
                </h1>
              </EuiTitle>
              <EuiText size="s" color="subdued" className="homWelcome__subtitle">
                <p>
                  <FormattedMessage id="kbn.home.welcomeDescription" defaultMessage="Your window into the Elastic Stack"/>
                </p>
              </EuiText>
              <EuiSpacer size="m" />
            </div>
          </header>
          <div className="homWelcome__content homWelcome-body">
            <EuiFlexGroup gutterSize="l">
              {step === 0 && <EuiFlexItem>
                <SampleDataCard
                  urlBasePath={urlBasePath}
                  onConfirm={this.onSampleDataConfirm}
                  onDecline={this.onSampleDataDecline}
                />
              </EuiFlexItem>}
              {step === 1 && <EuiFlexItem>
                <TelemetryOptInCard
                  urlBasePath={urlBasePath}
                  onConfirm={this.onTelemetryOptInConfirm}
                  onDecline={this.onTelemetryOptInDecline}
                />
              </EuiFlexItem>}
            </EuiFlexGroup>
          </div>
        </div>
      </EuiPortal>
    );
  }
}
