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
  EuiTab,
  EuiTabs,
} from '@elastic/eui';

import {
  RequestDetailsRequest,
  RequestDetailsResponse,
  RequestDetailsStats,
} from './details';
import { i18n } from '@kbn/i18n';

const DETAILS = [
  {
    name: 'Statistics',
    label: i18n.translate('inspectorViews.requests.statisticsTabLabel', {
      defaultMessage: 'Statistics'
    }),
    component: RequestDetailsStats
  },
  {
    name: 'Request',
    label: i18n.translate('inspectorViews.requests.requestTabLabel', {
      defaultMessage: 'Request'
    }),
    component: RequestDetailsRequest
  },
  {
    name: 'Response',
    label: i18n.translate('inspectorViews.requests.responseTabLabel', {
      defaultMessage: 'Response'
    }),
    component: RequestDetailsResponse
  },
];

class RequestDetails extends Component {

  state = {
    availableDetails: [],
    selectedDetail: null,
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    const selectedDetail = prevState && prevState.selectedDetail;
    const availableDetails = DETAILS.filter(detail =>
      !detail.component.shouldShow || detail.component.shouldShow(nextProps.request)
    );
    // If the previously selected detail is still available we want to stay
    // on this tab and not set another selectedDetail.
    if (selectedDetail && availableDetails.includes(selectedDetail)) {
      return { availableDetails };
    }

    return {
      availableDetails: availableDetails,
      selectedDetail: availableDetails[0]
    };
  }

  selectDetailsTab = (detail) => {
    if (detail !== this.state.selectedDetail) {
      this.setState({
        selectedDetail: detail
      });
    }
  };

  renderDetailTab = (detail) => {
    return (
      <EuiTab
        key={detail.name}
        isSelected={detail === this.state.selectedDetail}
        onClick={() => this.selectDetailsTab(detail)}
        data-test-subj={`inspectorRequestDetail${detail.name}`}
      >
        {detail.label}
      </EuiTab>
    );
  }

  render() {
    if (this.state.availableDetails.length === 0) {
      return null;
    }
    const DetailComponent = this.state.selectedDetail.component;
    return (
      <div>
        <EuiTabs size="s">
          { this.state.availableDetails.map(this.renderDetailTab) }
        </EuiTabs>
        <DetailComponent
          request={this.props.request}
        />
      </div>
    );
  }
}

RequestDetails.propTypes = {
  request: PropTypes.object.isRequired,
};

export { RequestDetails };
