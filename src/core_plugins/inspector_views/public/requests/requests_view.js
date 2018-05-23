import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiEmptyPrompt,
  EuiSpacer,
} from '@elastic/eui';

import { InspectorView } from 'ui/inspector';

import { RequestDetails } from './request_details';
import { RequestListEntry } from './request_list_entry';

import './requests_inspector.less';

class RequestsViewComponent extends Component {

  constructor(props) {
    super(props);
    this.requests = props.adapters.requests;
    this.requests.on('change', this._onRequestsChange);

    const requests = this.requests.getRequests();
    this.state = {
      requests: requests,
      request: requests.length ? requests[0] : null
    };
  }

  _onRequestsChange = () => {
    const requests = this.requests.getRequests();
    this.setState({ requests });
    if (!requests.includes(this.state.request)) {
      this.setState({
        request: requests.length ? requests[0] : null
      });
    }
  }

  selectRequest(request) {
    if (request !== this.state.request) {
      this.setState({ request });
    }
  }

  _renderRequest = (req, index) => {
    return (
      <RequestListEntry
        key={index}
        request={req}
        isSelected={this.state.request === req}
        onClick={() => this.selectRequest(req)}
      />
    );
  };

  componentWillReceiveProps(props) {
    if (props.vis !== this.props.vis) {
      // Vis is about to change. Remove listener from the previous vis requests
      // logger and attach it to the new requests logger.
      this.requests.removeListener('change', this._onRequestsChange);
      this.requests = props.vis.API.inspectorAdapters.requests;
      this.requests.on('change', this._onRequestsChange);
      const requests = this.requests.getRequests();
      // Also write the new vis requests to the state.
      this.setState({
        requests: requests,
        request: requests.length ? requests[0] : null
      });
    }
  }

  componentWillUnmount() {
    this.requests.removeListener('change', this._onRequestsChange);
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
        <ul>
          { this.state.requests.map(this._renderRequest) }
        </ul>
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
  icon: 'apmApp',
  order: 20,
  help: `The requests inspector allows you to inspect the requests the visualization
    did to collect its data.`,
  shouldShow(adapters) {
    return adapters.requests;
  },
  component: RequestsViewComponent
};

export { RequestsView };
