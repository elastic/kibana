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

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiEmptyPrompt,
  EuiSpacer,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';

import { InspectorView } from 'ui/inspector';
import { RequestStatus } from 'ui/inspector/adapters';

import { RequestSelector } from './request_selector';
import { RequestDetails } from './request_details';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

class RequestsViewComponent extends Component {

  constructor(props) {
    super(props);
    props.adapters.requests.on('change', this._onRequestsChange);

    const requests = props.adapters.requests.getRequests();
    this.state = {
      requests: requests,
      request: requests.length ? requests[0] : null
    };
  }

  _onRequestsChange = () => {
    const requests = this.props.adapters.requests.getRequests();
    const newState = { requests };
    if (!requests.includes(this.state.request)) {
      newState.request = requests.length ? requests[0] : null;
    }
    this.setState(newState);
  }

  selectRequest = (request) => {
    if (request !== this.state.request) {
      this.setState({ request });
    }
  }

  componentWillUnmount() {
    this.props.adapters.requests.removeListener('change', this._onRequestsChange);
  }

  renderEmptyRequests() {
    return (
      <InspectorView useFlex={true}>
        <EuiEmptyPrompt
          data-test-subj="inspectorNoRequestsMessage"
          title={
            <h2>
              <FormattedMessage
                id="inspectorViews.requests.noRequestsLoggedTitle"
                defaultMessage="No requests logged"
              />
            </h2>
          }
          body={
            <React.Fragment>
              <p>
                <FormattedMessage
                  id="inspectorViews.requests.noRequestsLoggedDescription.elementHasNotLoggedAnyRequestsText"
                  defaultMessage="The element hasn't logged any requests (yet)."
                />
              </p>
              <p>
                <FormattedMessage
                  id="inspectorViews.requests.noRequestsLoggedDescription.whatDoesItUsuallyMeanText"
                  defaultMessage="This usually means that there was no need to fetch any data or
                    that the element has not yet started fetching data."
                />
              </p>
            </React.Fragment>
          }
        />
      </InspectorView>
    );
  }

  render() {
    if (!this.state.requests || !this.state.requests.length) {
      return this.renderEmptyRequests();
    }

    const failedCount = this.state.requests.filter(
      req => req.status === RequestStatus.ERROR
    ).length;

    return (
      <InspectorView>
        <EuiText size="xs">
          <p role="status" aria-live="polite" aria-atomic="true">
            <FormattedMessage
              id="inspectorViews.requests.requestWasMadeDescription"
              defaultMessage="{requestsCount, plural, one {# request was} other {# requests were} } made{failedRequests}"
              values={{
                requestsCount: this.state.requests.length,
                failedRequests: (
                  failedCount > 0 ? (
                    <EuiTextColor color="danger">
                      <FormattedMessage
                        id="inspectorViews.requests.requestWasMadeDescription.requestHadFailureText"
                        defaultMessage=", {failedCount} had a failure"
                        values={{ failedCount }}
                      />
                    </EuiTextColor>
                  ) : ''
                )
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="xs"/>
        <RequestSelector
          requests={this.state.requests}
          selectedRequest={this.state.request}
          onRequestChanged={this.selectRequest}
        />
        <EuiSpacer size="xs"/>
        { this.state.request && this.state.request.description  &&
          <EuiText size="xs">
            <p>{this.state.request.description}</p>
          </EuiText>
        }
        <EuiSpacer size="m" />
        { this.state.request &&
          <RequestDetails
            request={this.state.request}
          />
        }
      </InspectorView>
    );
  }
}

RequestsViewComponent.propTypes = {
  adapters: PropTypes.object.isRequired,
};

const RequestsView = {
  title: i18n.translate('inspectorViews.requests.requestsTitle', {
    defaultMessage: 'Requests'
  }),
  order: 20,
  help: i18n.translate('inspectorViews.requests.requestsDescriptionTooltip', {
    defaultMessage: 'View the requests that collected the data'
  }),
  shouldShow(adapters) {
    return Boolean(adapters.requests);
  },
  component: RequestsViewComponent
};

export { RequestsView };
