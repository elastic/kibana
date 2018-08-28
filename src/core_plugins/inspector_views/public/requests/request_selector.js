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
  EuiBadge,
  EuiButtonEmpty,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiTextColor,
  EuiToolTip,
} from '@elastic/eui';

import { RequestStatus } from 'ui/inspector/adapters';

class RequestSelector extends Component {
  state = {
    isPopoverOpen: false,
  };

  togglePopover = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  }

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  }

  renderRequestDropdownItem = (request, index) => {
    const hasFailed = request.status === RequestStatus.ERROR;
    const inProgress = request.status === RequestStatus.PENDING;

    return (
      <EuiContextMenuItem
        key={index}
        icon={request === this.props.selectedRequest ? 'check' : 'empty'}
        onClick={() => {
          this.props.onRequestChanged(request);
          this.closePopover();
        }}
        toolTipContent={request.description}
        toolTipPosition="left"
      >
        <EuiTextColor color={hasFailed ? 'danger' : 'default'}>
          {request.name}
          { hasFailed && ' (failed)' }
          { inProgress &&
            <EuiLoadingSpinner
              size="s"
              aria-label="Request in progress"
              className="inspector-request-chooser__menu-spinner"
            />
          }
        </EuiTextColor>
      </EuiContextMenuItem>
    );
  }

  renderRequestDropdown() {
    const button = (
      <EuiButtonEmpty
        iconType="arrowDown"
        iconSide="right"
        size="s"
        className="inspector-request-chooser__request-title"
        onClick={this.togglePopover}
      >
        {this.props.selectedRequest.name}
      </EuiButtonEmpty>
    );

    return (
      <EuiPopover
        id="inspectorRequestChooser"
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel
          className="inspector-request-chooser__menu-panel"
          items={this.props.requests.map(this.renderRequestDropdownItem)}
        />
      </EuiPopover>
    );
  }

  render() {
    const { selectedRequest, requests } = this.props;
    return (
      <EuiFlexGroup
        alignItems="center"
        gutterSize="xs"
      >
        <EuiFlexItem
          grow={false}
          className="inspector-request-chooser__request-title"
        >
          Request:
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          {requests.length <= 1 &&
            <div className="inspector-request-chooser__single-request">
              {selectedRequest.name}
            </div>
          }
          {requests.length > 1 && this.renderRequestDropdown()}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          { selectedRequest.status !== RequestStatus.PENDING &&
            <EuiToolTip
              position="left"
              title={selectedRequest.status === RequestStatus.OK ? 'Request succeeded' : 'Request failed'}
              content="The total time the request took."
            >
              <EuiBadge
                color={selectedRequest.status === RequestStatus.OK ? 'secondary' : 'danger'}
                iconType={selectedRequest.status === RequestStatus.OK ? 'check' : 'cross'}
              >
                {selectedRequest.time}ms
              </EuiBadge>
            </EuiToolTip>
          }
          { selectedRequest.status === RequestStatus.PENDING &&
            <EuiLoadingSpinner
              size="m"
              aria-label="Request in progress"
            />
          }
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}

RequestSelector.propTypes = {
  requests: PropTypes.array.isRequired,
  selectedRequest: PropTypes.object.isRequired,
};

export { RequestSelector };
