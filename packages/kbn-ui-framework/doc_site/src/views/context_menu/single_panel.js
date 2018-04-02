import React, {
  Component,
} from 'react';

import {
  KuiButton,
  KuiContextMenuPanel,
  KuiContextMenuItem,
  KuiPopover,
} from '../../../../components';

export default class extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
    };
  }

  onButtonClick = () => {
    this.setState(prevState => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  render() {
    const button = (
      <KuiButton buttonType="basic" onClick={this.onButtonClick}>
        Click me to load a context menu
      </KuiButton>
    );

    const items = [
      (
        <KuiContextMenuItem
          key="A"
          icon={<span className="kuiIcon fa-user" />}
          onClick={() => { this.closePopover(); window.alert('A'); }}
        >
        Option A
        </KuiContextMenuItem>
      ), (
        <KuiContextMenuItem
          key="B"
          icon={<span className="kuiIcon fa-user" />}
          onClick={() => { this.closePopover(); window.alert('B'); }}
        >
        Option B
        </KuiContextMenuItem>
      ), (
        <KuiContextMenuItem
          key="C"
          icon={<span className="kuiIcon fa-user" />}
          onClick={() => { this.closePopover(); window.alert('C'); }}
        >
        Option C
        </KuiContextMenuItem>
      )
    ];

    return (
      <KuiPopover
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        panelPaddingSize="none"
        withTitle
        anchorPosition="left"
      >
        <KuiContextMenuPanel
          title="Options"
          items={items}
        />
      </KuiPopover>
    );
  }
}
