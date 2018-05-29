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
import className from 'classnames';

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiTitle,
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
    const itemClass = className({
      'inspector-request-chooser__menu-item--failed': hasFailed,
    });
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
        className={itemClass}
      >
        {request.name}
        { hasFailed && ' (failed)' }
        { inProgress &&
          <EuiLoadingSpinner
            size="s"
            aria-label="Request in progress"
            className="inspector-request-chooser__menu-spinner"
          />
        }
      </EuiContextMenuItem>
    );
  }

  renderRequestDropdown() {
    const failedCount = this.props.requests.filter(
      req => req.status === RequestStatus.ERROR
    ).length;
    const button = (
      <EuiButtonEmpty
        iconType="arrowDown"
        iconSide="right"
        size="s"
        onClick={this.togglePopover}
      >
        ({this.props.requests.length - 1} more requests
        { failedCount > 0 && ` / ${failedCount} failed`}
        )
      </EuiButtonEmpty>
    );

    return (
      <EuiPopover
        id="inspectorRequestChooser"
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        panelPaddingSize="none"
        anchorPosition="downRight"
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
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>{selectedRequest.name}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          { selectedRequest.status !== RequestStatus.PENDING &&
            <EuiBadge
              color={selectedRequest.status === RequestStatus.OK ? 'secondary' : 'danger'}
              iconType={selectedRequest.status === RequestStatus.OK ? 'check' : 'cross'}
            >
              {selectedRequest.time}ms
            </EuiBadge>
          }
          { selectedRequest.status === RequestStatus.PENDING &&
            <EuiLoadingSpinner
              size="m"
              aria-label="Request in progress"
            />
          }
        </EuiFlexItem>
        <EuiFlexItem grow={true} />
        { requests.length > 1 &&
          <EuiFlexItem grow={false}>
            { this.renderRequestDropdown() }
          </EuiFlexItem>
        }
      </EuiFlexGroup>
    );
  }
}

export { RequestSelector };
