/* eslint-disable react/forbid-elements */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { EuiPopover } from '@elastic/eui';

export class Popover extends Component {
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
    // TODO: This should just pass {...rest} otherwise it won't get EUI updates.
    const {
      className,
      button,
      children,
      panelClassName,
      anchorPosition,
      panelPaddingSize,
      withTitle,
      ownFocus,
      title,
      ...rest
    } = this.props;

    return (
      <EuiPopover
        panelClassName={panelClassName}
        title={title}
        withTitle={withTitle}
        anchorPosition={anchorPosition}
        button={button(this.handleClick)}
        isOpen={this.state.isPopoverOpen}
        panelPaddingSize={panelPaddingSize}
        closePopover={this.closePopover}
        className={className}
        ownFocus={ownFocus}
        {...rest}
      >
        {children({ closePopover: this.closePopover })}
      </EuiPopover>
    );
  }
}

Popover.propTypes = {
  isOpen: PropTypes.bool,
  ownFocus: PropTypes.bool,
  withTitle: PropTypes.bool,
  button: PropTypes.func.isRequired,
  children: PropTypes.func,
  className: PropTypes.string,
  anchorPosition: PropTypes.string,
  panelClassName: PropTypes.string,
  title: PropTypes.string,
  panelPaddingSize: PropTypes.string,
};
