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
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

/**
 * Shows a full-screen welcome page that gives helpful quick links to beginners.
 */
export class Welcome extends React.Component {
  hideOnEsc = e => {
    if (e.key === 'Escape') {
      this.props.onSkip();
    }
  };

  componentDidMount() {
    document.addEventListener('keydown', this.hideOnEsc);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.hideOnEsc);
  }

  render() {
    const { urlBasePath, onSkip } = this.props;

    return (
      <div className="homWelcome">
        <header className="homWelcome__header">
          <div className="homWelcome__content eui-textCenter">
            <EuiSpacer size="xxl" />
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
            <EuiSpacer size="xl" />
          </div>
        </header>
        <div className="homWelcome__content homWelcome-body">
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem>
              <EuiCard
                image={`${urlBasePath}/plugins/kibana/assets/illo_dashboard.png`}
                textAlign="left"
                title={<FormattedMessage id="kbn.home.letsStartTitle" defaultMessage="Let's get started"/>}
                description={
                  <FormattedMessage
                    id="kbn.home.letsStartDescription"
                    defaultMessage="We noticed that you don't have any data in your cluster.
You can try our sample data and dashboards or jump in with your own data."
                  />}
                footer={
                  <footer>
                    <EuiButton
                      fill
                      className="homWelcome__footerAction"
                      href="#/home/tutorial_directory/sampleData"
                    >
                      <FormattedMessage id="kbn.home.tryButtonLabel" defaultMessage="Try our sample data"/>
                    </EuiButton>
                    <EuiButtonEmpty
                      className="homWelcome__footerAction"
                      onClick={onSkip}
                      data-test-subj="skipWelcomeScreen"
                    >
                      <FormattedMessage id="kbn.home.exploreButtonLabel" defaultMessage="Explore on my own"/>
                    </EuiButtonEmpty>
                  </footer>
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>
    );
  }
}

Welcome.propTypes = {
  urlBasePath: PropTypes.string.isRequired,
  onSkip: PropTypes.func.isRequired,
};
