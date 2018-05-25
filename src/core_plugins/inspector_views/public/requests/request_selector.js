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
    const hasFailed = request.response && request.response.status === RequestStatus.ERROR;
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
      </EuiContextMenuItem>
    );
  }

  renderRequestDropdown() {
    const failedCount = this.props.requests.filter(
      req => req.response && req.response.status === RequestStatus.ERROR
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
    const status = selectedRequest.response ? selectedRequest.response.status : null;
    return (
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>{selectedRequest.name}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          { status &&
            <EuiBadge
              color={status === RequestStatus.OK ? 'secondary' : 'danger'}
              iconType={status === RequestStatus.OK ? 'check' : 'cross'}
            >
              {selectedRequest.time}ms
            </EuiBadge>
          }
          { !status && <EuiLoadingSpinner size="m" /> }
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
