import React, {
  Component,
} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import FocusTrap from 'focus-trap-react';
import tabbable from 'tabbable';

import { cascadingMenuKeyCodes } from '../../services';

import { KuiOutsideClickDetector } from '../outside_click_detector';

import { KuiPanelSimple, SIZES } from '../../components/panel_simple';

const anchorPositionToClassNameMap = {
  'center': '',
  'left': 'kuiPopover--anchorLeft',
  'right': 'kuiPopover--anchorRight',
};

export const ANCHOR_POSITIONS = Object.keys(anchorPositionToClassNameMap);

export class KuiPopover extends Component {
  constructor(props) {
    super(props);

    this.closingTransitionTimeout = undefined;

    this.state = {
      isClosing: false,
      isOpening: false,
    };
  }

  onKeyDown = e => {
    if (e.keyCode === cascadingMenuKeyCodes.ESCAPE) {
      this.props.closePopover();
    }
  };

  updateFocus() {
    // Wait for the DOM to update.
    window.requestAnimationFrame(() => {
      if (!this.panel) {
        return;
      }

      // If we've already focused on something inside the panel, everything's fine.
      if (this.panel.contains(document.activeElement)) {
        return;
      }

      // Otherwise let's focus the first tabbable item and expedite input from the user.
      const tabbableItems = tabbable(this.panel);
      if (tabbableItems.length) {
        tabbableItems[0].focus();
      }
    });
  }

  componentDidMount() {
    this.updateFocus();
  }

  componentWillReceiveProps(nextProps) {
    // The popover is being opened.
    if (!this.props.isOpen && nextProps.isOpen) {
      clearTimeout(this.closingTransitionTimeout);
      // We need to set this state a beat after the render takes place, so that the CSS
      // transition can take effect.
      window.requestAnimationFrame(() => {
        this.setState({
          isOpening: true,
        });
      });
    }

    // The popover is being closed.
    if (this.props.isOpen && !nextProps.isOpen) {
      // If the user has just closed the popover, queue up the removal of the content after the
      // transition is complete.
      this.setState({
        isClosing: true,
        isOpening: false,
      });

      this.closingTransitionTimeout = setTimeout(() => {
        this.setState({
          isClosing: false,
        });
      }, 250);
    }
  }

  componentDidUpdate() {
    this.updateFocus();
  }

  componentWillUnmount() {
    clearTimeout(this.closingTransitionTimeout);
  }

  panelRef = node => {
    if (this.props.ownFocus) {
      this.panel = node;
    }
  };

  render() {
    const {
      anchorPosition,
      button,
      isOpen,
      ownFocus,
      withTitle,
      children,
      className,
      closePopover,
      panelClassName,
      panelPaddingSize,
      ...rest
    } = this.props;

    const classes = classNames(
      'kuiPopover',
      anchorPositionToClassNameMap[anchorPosition],
      className,
      {
        'kuiPopover-isOpen': this.state.isOpening,
        'kuiPopover--withTitle': withTitle,
      },
    );

    const panelClasses = classNames('kuiPopover__panel', panelClassName);

    let panel;

    if (isOpen || this.state.isClosing) {
      let tabIndex;
      let initialFocus;

      if (ownFocus) {
        tabIndex = '0';
        initialFocus = () => this.panel;
      }

      panel = (
        <FocusTrap
          focusTrapOptions={{
            clickOutsideDeactivates: true,
            initialFocus,
          }}
        >
          <KuiPanelSimple
            panelRef={this.panelRef}
            className={panelClasses}
            paddingSize={panelPaddingSize}
            tabIndex={tabIndex}
            hasShadow
          >
            {children}
          </KuiPanelSimple>
        </FocusTrap>
      );
    }

    return (
      <KuiOutsideClickDetector onOutsideClick={closePopover}>
        <div
          className={classes}
          onKeyDown={this.onKeyDown}
          {...rest}
        >
          {button}
          {panel}
        </div>
      </KuiOutsideClickDetector>
    );
  }
}

KuiPopover.propTypes = {
  isOpen: PropTypes.bool,
  ownFocus: PropTypes.bool,
  withTitle: PropTypes.bool,
  closePopover: PropTypes.func.isRequired,
  button: PropTypes.node.isRequired,
  children: PropTypes.node,
  anchorPosition: PropTypes.oneOf(ANCHOR_POSITIONS),
  panelClassName: PropTypes.string,
  panelPaddingSize: PropTypes.oneOf(SIZES),
};

KuiPopover.defaultProps = {
  isOpen: false,
  ownFocus: false,
  anchorPosition: 'center',
  panelPaddingSize: 'm',
};
