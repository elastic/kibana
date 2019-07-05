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

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

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
        data-test-subj={`inspectorRequestChooser${request.name}`}
      >
        <EuiTextColor color={hasFailed ? 'danger' : 'default'}>
          {request.name}
          { hasFailed && <FormattedMessage
            id="inspectorViews.requests.failedLabel"
            defaultMessage=" (failed)"
          />}
          { inProgress &&
            <EuiLoadingSpinner
              size="s"
              aria-label={i18n.translate('inspectorViews.requests.requestInProgressAriaLabel', {
                defaultMessage: 'Request in progress'
              })}
              className="insRequestSelector__menuSpinner"
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
        onClick={this.togglePopover}
        data-test-subj="inspectorRequestChooser"
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
        repositionOnScroll
      >
        <EuiContextMenuPanel
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
        >
          <strong>
            <FormattedMessage
              id="inspectorViews.requests.requestLabel"
              defaultMessage="Request:"
            />
          </strong>
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          {requests.length <= 1 &&
            <div className="insRequestSelector__singleRequest">
              {selectedRequest.name}
            </div>
          }
          {requests.length > 1 && this.renderRequestDropdown()}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          { selectedRequest.status !== RequestStatus.PENDING &&
            <EuiToolTip
              position="left"
              title={selectedRequest.status === RequestStatus.OK ?
                <FormattedMessage
                  id="inspectorViews.requests.requestSucceededTooltipTitle"
                  defaultMessage="Request succeeded"
                /> :
                <FormattedMessage
                  id="inspectorViews.requests.requestFailedTooltipTitle"
                  defaultMessage="Request failed"
                />
              }
              content={<FormattedMessage
                id="inspectorViews.requests.requestTooltipDescription"
                defaultMessage="The total time the request took."
              />}
            >
              <EuiBadge
                color={selectedRequest.status === RequestStatus.OK ? 'secondary' : 'danger'}
                iconType={selectedRequest.status === RequestStatus.OK ? 'check' : 'cross'}
              >

                <FormattedMessage
                  id="inspectorViews.requests.requestTimeLabel"
                  defaultMessage="{requestTime}ms"
                  values={{ requestTime: selectedRequest.time }}
                />
              </EuiBadge>
            </EuiToolTip>
          }
          { selectedRequest.status === RequestStatus.PENDING &&
            <EuiLoadingSpinner
              size="m"
              aria-label={i18n.translate('inspectorViews.requests.requestInProgressAriaLabel', {
                defaultMessage: 'Request in progress'
              })}
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
