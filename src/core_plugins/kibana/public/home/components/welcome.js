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
import PropTypes from 'prop-types';
import {
  EuiCard,
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiIcon,
} from '@elastic/eui';

/**
 * Shows a full-screen welcome page that gives helpful quick links to beginners.
 */
export class Welcome extends React.Component {
  hideOnEsc = (e) => {
    if (e.key === 'Escape') {
      this.props.skipWelcome();
    }
  }

  componentDidMount() {
    document.addEventListener('keydown', this.hideOnEsc);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.hideOnEsc);
  }

  render() {
    const { skipWelcome, kibanaVersion } = this.props;
    const majorVersion = kibanaVersion.split('.')[0];

    return (
      <div className="home-welcome">
        <header className="home-welcome-header">
          <div className="home-welcome-content eui-textCenter">
            <EuiSpacer size="xxl" />
            <span className="home-welcome-logo">
              <EuiIcon type="logoKibana" size="xxl" />
            </span>
            <EuiTitle size="l" className="home-welcome-title">
              <h1>Welcome to Kibana {majorVersion}</h1>
            </EuiTitle>
            <EuiText size="s">Your window into the Elastic stack</EuiText>
            <EuiSpacer size="xl" />
          </div>
        </header>
        <div className="home-welcome-content home-welcome-body">
          <header className="eui-textCenter">
            <EuiSpacer size="xxl" />
            <EuiText className="home-welcome-subheading">
              Choose a way to start your journey
            </EuiText>
            <EuiSpacer size="xl" />
          </header>

          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem>
              <EuiCard
                icon={<EuiIcon size="xxl" type="addDataApp" />}
                title="Play around with sample data"
                description="See what Kibana is capable of without all the setup."
                href="#/home/tutorial_directory/sampleData"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiCard
                data-test-subj="skipWelcomeScreen"
                icon={<EuiIcon size="xxl" type="cross" color="accent" />}
                title="I don't need help"
                description="Skip the tour. I know what I'm doing."
                onClick={skipWelcome}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>
    );
  }
}

Welcome.propTypes = {
  kibanaVersion: PropTypes.string.isRequired,
  skipWelcome: PropTypes.func.isRequired,
};
