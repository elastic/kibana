import React, {
  Component,
} from 'react';

import {
  KuiPopover,
  KuiPopoverTitle,
  KuiButton,
} from '../../../../components';

export default class extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
    };
  }

  onButtonClick() {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  }

  closePopover() {
    this.setState({
      isPopoverOpen: false,
    });
  }

  render() {
    const button = (
      <KuiButton
        buttonType="basic"
        onClick={this.onButtonClick.bind(this)}
      >
        Show popover with Title
      </KuiButton>
    );

    return (
      <KuiPopover
        ownFocus
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover.bind(this)}
        panelPaddingSize="none"
        withTitle
      >
        <div style={{ width: '300px' }}>
          <KuiPopoverTitle>Hello, I&rsquo;m a popover title</KuiPopoverTitle>
          <p className="kuiText" style={{ padding: 20 }}>
            Popover content that&rsquo;s wider than the default width
          </p>
        </div>
      </KuiPopover>
    );
  }
}
