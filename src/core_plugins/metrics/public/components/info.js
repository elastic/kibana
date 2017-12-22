import React, { Component } from 'react';
import {
  EuiPopover,
  EuiButtonIcon
} from '@elastic/eui';

export class Info extends Component {

  constructor(props) {
    super(props);
    this.state = { show: false };
  }

  closePopover = () => {
    this.setState({ show: false });
  }

  showPopover = () => {
    this.setState({ show: true });
  }

  render() {
    const { message } = this.props;
    const button = (
      <EuiButtonIcon
        onClick={this.showPopover}
        size="s"
        iconType="iInCircle"
        color="text"
        aria-label="help"
      />
    );
    return (
      <EuiPopover
        id="help-popover"
        ownFocus
        button={button}
        isOpen={this.state.show}
        closePopover={this.closePopover}
        anchorPosition="upCenter"
      >
        {message}
      </EuiPopover>
    );
  }

}
