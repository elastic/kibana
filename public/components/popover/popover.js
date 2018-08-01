/* eslint react/no-did-mount-set-state: 0, react/forbid-elements: 0 */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { EuiPopover } from '@elastic/eui';

export class Popover extends Component {
  static propTypes = {
    isOpen: PropTypes.bool,
    ownFocus: PropTypes.bool,
    button: PropTypes.func.isRequired,
    children: PropTypes.func.isRequired,
  };

  static defaultProps = {
    isOpen: false,
    ownFocus: true,
  };

  state = {
    isPopoverOpen: false,
  };

  componentDidMount() {
    if (this.props.isOpen) this.setState({ isPopoverOpen: true });
  }

  handleClick = () => {
    this.setState(state => ({
      isPopoverOpen: !state.isPopoverOpen,
    }));
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  render() {
    const { button, children, ...rest } = this.props;

    return (
      <EuiPopover
        {...rest}
        button={button(this.handleClick)}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
      >
        {children({ closePopover: this.closePopover })}
      </EuiPopover>
    );
  }
}
