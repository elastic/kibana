import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Popover as BootstrapPopover, Overlay } from 'react-bootstrap';
import uuid from 'uuid/v4';

// mapping for EUI popover positions to bootstrap placements
const anchorPositions = {
  upCenter: 'top',
  upLeft: 'top',
  upRight: 'top',
  downCenter: 'bottom',
  downLeft: 'bottom',
  downRight: 'bottom',
  leftCenter: 'left',
  leftUp: 'left',
  leftDown: 'left',
  rightCenter: 'right',
  rightUp: 'right',
  rightDown: 'right',
};

export class Popover extends PureComponent {
  static propTypes = {
    id: PropTypes.string,
    panelClassName: PropTypes.string,
    button: PropTypes.func.isRequired,
    children: PropTypes.func.isRequired,
    title: PropTypes.string,
    anchorPosition: PropTypes.string,
    style: PropTypes.object,
  };

  static defaultProps = {
    ownFocus: false,
    anchorPosition: 'downCenter',
    panelPaddingSize: 'm',
  };

  state = {
    isPopoverOpen: false,
  };

  handleClick = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  render() {
    const { id, button, children, panelClassName, title, anchorPosition, style } = this.props;

    const position = anchorPositions[anchorPosition] ? anchorPosition : 'downCenter';

    // TODO: replace bootstrap popover with EuiPopover https://github.com/elastic/kibana-canvas/issues/612
    // Pending https://github.com/elastic/eui/issues/873
    const popover = (
      <BootstrapPopover id={id || `popover-${uuid()}`} className={panelClassName} title={title}>
        {children({ closePopover: this.closePopover })}
      </BootstrapPopover>
    );

    return (
      <div
        ref={button => {
          this.target = button;
        }}
        style={style}
      >
        {button(this.handleClick)}
        <Overlay
          show={this.state.isPopoverOpen}
          onHide={() => this.setState({ isPopoverOpen: false })}
          rootClose
          placement={anchorPositions[position]}
          target={this.target}
        >
          {popover}
        </Overlay>
      </div>
    );
  }
}
