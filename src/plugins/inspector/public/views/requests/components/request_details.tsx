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
import { i18n } from '@kbn/i18n';
import { EuiTab, EuiTabs } from '@elastic/eui';

import { RequestDetailsRequest, RequestDetailsResponse, RequestDetailsStats } from './details';
import { RequestDetailsProps } from './types';

interface RequestDetailsState {
  availableDetails: DetailViewData[];
  selectedDetail: DetailViewData | null;
}

export interface DetailViewData {
  name: string;
  label: string;
  component: any;
}

const DETAILS: DetailViewData[] = [
  {
    name: 'Statistics',
    label: i18n.translate('inspector.requests.statisticsTabLabel', {
      defaultMessage: 'Statistics',
    }),
    component: RequestDetailsStats,
  },
  {
    name: 'Request',
    label: i18n.translate('inspector.requests.requestTabLabel', {
      defaultMessage: 'Request',
    }),
    component: RequestDetailsRequest,
  },
  {
    name: 'Response',
    label: i18n.translate('inspector.requests.responseTabLabel', {
      defaultMessage: 'Response',
    }),
    component: RequestDetailsResponse,
  },
];

export class RequestDetails extends Component<RequestDetailsProps, RequestDetailsState> {
  static propTypes = {
    request: PropTypes.object.isRequired,
  };

  state = {
    availableDetails: [],
    selectedDetail: null,
  };

  static getDerivedStateFromProps(nextProps: RequestDetailsProps, prevState: RequestDetailsState) {
    const selectedDetail = prevState && prevState.selectedDetail;
    const availableDetails = DETAILS.filter(
      (detail: DetailViewData) =>
        !detail.component.shouldShow || detail.component.shouldShow(nextProps.request)
    );
    // If the previously selected detail is still available we want to stay
    // on this tab and not set another selectedDetail.
    if (selectedDetail && availableDetails.includes(selectedDetail)) {
      return { availableDetails };
    }

    return {
      availableDetails,
      selectedDetail: availableDetails[0],
    };
  }

  selectDetailsTab = (detail: DetailViewData) => {
    if (detail !== this.state.selectedDetail) {
      this.setState({
        selectedDetail: detail,
      });
    }
  };

  static getSelectedDetailComponent(detail: DetailViewData | null) {
    return detail ? detail.component : null;
  }

  renderDetailTab = (detail: DetailViewData) => {
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
  };

  render() {
    const { selectedDetail, availableDetails } = this.state;
    const DetailComponent = RequestDetails.getSelectedDetailComponent(selectedDetail);

    if (!availableDetails.length || !DetailComponent) {
      return null;
    }

    return (
      <>
        <EuiTabs size="s">{this.state.availableDetails.map(this.renderDetailTab)}</EuiTabs>
        <DetailComponent request={this.props.request} />
      </>
    );
  }
}
