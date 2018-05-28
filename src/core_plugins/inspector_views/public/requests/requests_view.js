import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiEmptyPrompt,
  EuiSpacer,
} from '@elastic/eui';

import { InspectorView } from 'ui/inspector';

import { RequestSelector } from './request_selector';
import { RequestDetails } from './request_details';

import './requests_inspector.less';

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
    this.setState({ requests });
    if (!requests.includes(this.state.request)) {
      this.setState({
        request: requests.length ? requests[0] : null
      });
    }
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
          title={<h2>No requests logged</h2>}
          body={
            <React.Fragment>
              <p>The element hasn&apos;t logged any requests (yet).</p>
              <p>
                This usually means that there was no need to fetch any data or
                that the element has not yet started fetching data.
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

    return (
      <InspectorView>
        <RequestSelector
          requests={this.state.requests}
          selectedRequest={this.state.request}
          onRequestChanged={this.selectRequest}
        />
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
  title: 'Requests',
  order: 20,
  help: `The requests inspector allows you to inspect the requests the visualization
    did to collect its data.`,
  shouldShow(adapters) {
    return adapters.requests;
  },
  component: RequestsViewComponent
};

export { RequestsView };
