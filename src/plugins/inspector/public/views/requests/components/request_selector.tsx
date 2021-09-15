/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiTextColor,
  EuiToolTip,
} from '@elastic/eui';

import { RequestStatus } from '../../../../common/adapters';
import { Request } from '../../../../common/adapters/request/types';

interface RequestSelectorState {
  isPopoverOpen: boolean;
}

interface RequestSelectorProps {
  requests: Request[];
  selectedRequest: Request;
  onRequestChanged: (request: Request) => void;
}

export class RequestSelector extends Component<RequestSelectorProps, RequestSelectorState> {
  static propTypes = {
    requests: PropTypes.array.isRequired,
    selectedRequest: PropTypes.object.isRequired,
    onRequestChanged: PropTypes.func,
  };

  state = {
    isPopoverOpen: false,
  };

  handleSelected = (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    const selectedOption = this.props.requests.find(request => request.id === selectedOptions[0].value);
    console.log({selectedOptions})

    if(selectedOption) {
      this.props.onRequestChanged(selectedOption);
    }
  }

  togglePopover = () => {
    this.setState((prevState: RequestSelectorState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  renderRequestDropdownItem = (request: Request, index: number) => {
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

          {hasFailed && (
            <FormattedMessage id="inspector.requests.failedLabel" defaultMessage=" (failed)" />
          )}

          {inProgress && (
            <EuiLoadingSpinner
              size="s"
              aria-label={i18n.translate('inspector.requests.requestInProgressAriaLabel', {
                defaultMessage: 'Request in progress',
              })}
              className="insRequestSelector__menuSpinner"
            />
          )}
        </EuiTextColor>
      </EuiContextMenuItem>
    );
  };

  renderRequestCombobox() {
    // const button = (
    //   <EuiButtonEmpty
    //     iconType="arrowDown"
    //     iconSide="right"
    //     size="s"
    //     onClick={this.togglePopover}
    //     data-test-subj="inspectorRequestChooser"
    //   >
    //     {this.props.selectedRequest.name}
    //   </EuiButtonEmpty>
    // );

    const options = this.props.requests.map(item => {
      return {
        label: item.name,
        value: item.id,
      }
    });

    return (
      <>
        {/* <EuiPopover
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
            data-test-subj="inspectorRequestChooserMenuPanel"
          />
        </EuiPopover> */}

      <EuiComboBox
        id="inspectorRequestChooser"
        isClearable={false}
        fullWidth={true}
        onChange={this.handleSelected}
        options={options}
        prepend="Request"
        selectedOptions={
          [
            {
              label: this.props.selectedRequest.name,
              value: this.props.selectedRequest.id
            }
          ]
        }
        singleSelection={{ asPlainText: true }}
      />
      </>
    );
  }

  render() {
    const { selectedRequest, requests } = this.props;

    return (
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={true}>
          {/* {requests.length <= 1 && (
            <div
              className="insRequestSelector__singleRequest"
              data-test-subj="inspectorRequestName"
            >
              <strong>
                <FormattedMessage id="inspector.requests.requestLabel" defaultMessage="Request:" />{" "}
              </strong>
              {selectedRequest.name}
            </div>
          )}
          {requests.length > 1 && this.renderRequestDropdown()} */}
          {requests.length && this.renderRequestCombobox()}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {selectedRequest.status !== RequestStatus.PENDING && (
            <EuiToolTip
              position="left"
              title={
                selectedRequest.status === RequestStatus.OK ? (
                  <FormattedMessage
                    id="inspector.requests.requestSucceededTooltipTitle"
                    defaultMessage="Request succeeded"
                  />
                ) : (
                  <FormattedMessage
                    id="inspector.requests.requestFailedTooltipTitle"
                    defaultMessage="Request failed"
                  />
                )
              }
              content={
                <FormattedMessage
                  id="inspector.requests.requestTooltipDescription"
                  defaultMessage="The total time the request took."
                />
              }
            >
              <EuiBadge
                color={selectedRequest.status === RequestStatus.OK ? 'secondary' : 'danger'}
                iconType={selectedRequest.status === RequestStatus.OK ? 'check' : 'cross'}
              >
                <FormattedMessage
                  id="inspector.requests.requestTimeLabel"
                  defaultMessage="{requestTime}ms"
                  values={{ requestTime: selectedRequest.time }}
                />
              </EuiBadge>
            </EuiToolTip>
          )}
          {selectedRequest.status === RequestStatus.PENDING && (
            <EuiLoadingSpinner
              size="m"
              aria-label={i18n.translate('inspector.requests.requestInProgressAriaLabel', {
                defaultMessage: 'Request in progress',
              })}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
