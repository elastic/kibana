import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiTab,
  EuiTabs,
} from '@elastic/eui';

import {
  RequestDetailsDescription,
  RequestDetailsRequest,
  RequestDetailsResponse,
  RequestDetailsStats,
} from './details';

const DETAILS = [
  { name: 'Description', component: RequestDetailsDescription },
  { name: 'Statistics', component: RequestDetailsStats },
  { name: 'Request', component: RequestDetailsRequest },
  { name: 'Response', component: RequestDetailsResponse },
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
        {detail.name}
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
