import React, {
  cloneElement,
  Component,
} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import tabbable from 'tabbable';

import { KuiPopoverTitle } from '../../components';
import { cascadingMenuKeyCodes } from '../../services';

const transitionDirectionAndTypeToClassNameMap = {
  next: {
    in: 'kuiContextMenuPanel-txInLeft',
    out: 'kuiContextMenuPanel-txOutLeft',
  },
  previous: {
    in: 'kuiContextMenuPanel-txInRight',
    out: 'kuiContextMenuPanel-txOutRight',
  },
};

export class KuiContextMenuPanel extends Component {
  static propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    title: PropTypes.string,
    onClose: PropTypes.func,
    onHeightChange: PropTypes.func,
    transitionType: PropTypes.oneOf(['in', 'out']),
    transitionDirection: PropTypes.oneOf(['next', 'previous']),
    onTransitionComplete: PropTypes.func,
    onUseKeyboardToNavigate: PropTypes.func,
    hasFocus: PropTypes.bool,
    items: PropTypes.array,
    showNextPanel: PropTypes.func,
    showPreviousPanel: PropTypes.func,
    initialFocusedItemIndex: PropTypes.number,
  }

  static defaultProps = {
    hasFocus: true,
    items: [],
  }

  constructor(props) {
    super(props);

    this.menuItems = [];
    this.state = {
      isTransitioning: Boolean(props.transitionType),
      focusedItemIndex: props.initialFocusedItemIndex,
    };
  }

  incrementFocusedItemIndex = amount => {
    let nextFocusedItemIndex;

    if (this.state.focusedItemIndex === undefined) {
      // If this is the beginning of the user's keyboard navigation of the menu, then we'll focus
      // either the first or last item.
      nextFocusedItemIndex = amount < 0 ? this.menuItems.length - 1 : 0;
    } else {
      nextFocusedItemIndex = this.state.focusedItemIndex + amount;

      if (nextFocusedItemIndex < 0) {
        nextFocusedItemIndex = this.menuItems.length - 1;
      } else if (nextFocusedItemIndex === this.menuItems.length) {
        nextFocusedItemIndex = 0;
      }
    }

    this.setState({
      focusedItemIndex: nextFocusedItemIndex,
    });
  };

  onKeyDown = e => {
    // If this panel contains items you can use the left arrow key to go back at any time.
    // But if it doesn't contain items, then you have to focus on the back button specifically,
    // since there could be content inside the panel which requires use of the left arrow key,
    // e.g. text inputs.
    if (
      this.props.items.length
      || document.activeElement === this.backButton
      || document.activeElement === this.panel
    ) {
      if (e.keyCode === cascadingMenuKeyCodes.LEFT) {
        if (this.props.showPreviousPanel) {
          this.props.showPreviousPanel();

          if (this.props.onUseKeyboardToNavigate) {
            this.props.onUseKeyboardToNavigate();
          }
        }
      }
    }

    if (this.props.items.length) {
      switch (e.keyCode) {
        case cascadingMenuKeyCodes.TAB:
          // We need to sync up with the user if s/he is tabbing through the items.
          const focusedItemIndex = this.menuItems.indexOf(document.activeElement);

          this.setState({
            focusedItemIndex:
              (focusedItemIndex >= 0 && focusedItemIndex < this.menuItems.length)
                ? focusedItemIndex
                : undefined,
          });
          break;

        case cascadingMenuKeyCodes.UP:
          e.preventDefault();
          this.incrementFocusedItemIndex(-1);

          if (this.props.onUseKeyboardToNavigate) {
            this.props.onUseKeyboardToNavigate();
          }
          break;

        case cascadingMenuKeyCodes.DOWN:
          e.preventDefault();
          this.incrementFocusedItemIndex(1);

          if (this.props.onUseKeyboardToNavigate) {
            this.props.onUseKeyboardToNavigate();
          }
          break;

        case cascadingMenuKeyCodes.RIGHT:
          if (this.props.showNextPanel) {
            e.preventDefault();
            this.props.showNextPanel(this.state.focusedItemIndex);

            if (this.props.onUseKeyboardToNavigate) {
              this.props.onUseKeyboardToNavigate();
            }
          }
          break;

        default:
          break;
      }
    }
  };

  updateFocus() {
    // If this panel has lost focus, then none of its content should be focused.
    if (!this.props.hasFocus) {
      if (this.panel.contains(document.activeElement)) {
        document.activeElement.blur();
      }
      return;
    }

    // Setting focus while transitioning causes the animation to glitch, so we have to wait
    // until it's finished before we focus anything.
    if (this.state.isTransitioning) {
      return;
    }

    // If there aren't any items then this is probably a form or something.
    if (!this.menuItems.length) {
      // If we've already focused on something inside the panel, everything's fine.
      if (this.panel.contains(document.activeElement)) {
        return;
      }

      // Otherwise let's focus the first tabbable item and expedite input from the user.
      if (this.content) {
        const tabbableItems = tabbable(this.content);
        if (tabbableItems.length) {
          tabbableItems[0].focus();
        }
      }
      return;
    }

    // If an item is focused, focus it.
    if (this.state.focusedItemIndex !== undefined) {
      this.menuItems[this.state.focusedItemIndex].focus();
      return;
    }

    // Focus on the panel as a last resort.
    if (!this.panel.contains(document.activeElement)) {
      this.panel.focus();
    }
  }

  onTransitionComplete = () => {
    this.setState({
      isTransitioning: false,
    });

    if (this.props.onTransitionComplete) {
      this.props.onTransitionComplete();
    }
  }

  componentDidMount() {
    this.updateFocus();
  }

  componentWillReceiveProps(nextProps) {
    // Clear refs to menuItems if we're getting new ones.
    if (nextProps.items !== this.props.items) {
      this.menuItems = [];
    }

    if (nextProps.transitionType) {
      this.setState({
        isTransitioning: true,
      });
    }
  }

  componentDidUpdate() {
    this.updateFocus();
  }

  menuItemRef = (index, node) => {
    // There's a weird bug where if you navigate to a panel without items, then this callback
    // is still invoked, so we have to do a truthiness check.
    if (node) {
      // Store all menu items.
      this.menuItems[index] = node;
    }
  };

  panelRef = node => {
    this.panel = node;

    if (this.panel) {
      if (this.props.onHeightChange) {
        this.props.onHeightChange(this.panel.clientHeight);
      }
    }
  };

  contentRef = node => {
    this.content = node;
  };

  render() {
    const {
      children,
      className,
      onClose,
      title,
      onHeightChange, // eslint-disable-line no-unused-vars
      transitionType,
      transitionDirection,
      onTransitionComplete, // eslint-disable-line no-unused-vars
      onUseKeyboardToNavigate, // eslint-disable-line no-unused-vars
      hasFocus, // eslint-disable-line no-unused-vars
      items,
      initialFocusedItemIndex, // eslint-disable-line no-unused-vars
      showNextPanel, // eslint-disable-line no-unused-vars
      showPreviousPanel, // eslint-disable-line no-unused-vars
      ...rest
    } = this.props;
    let panelTitle;

    if (title) {
      if (Boolean(onClose)) {
        panelTitle = (
          <button
            className="kuiContextMenuPanelTitle"
            onClick={onClose}
            ref={node => { this.backButton = node; }}
            data-test-subj="contextMenuPanelTitleButton"
          >
            <span className="kuiContextMenu__itemLayout">
              <span className="kuiContextMenu__icon kuiIcon fa-angle-left" />
              <span className="kuiContextMenu__text">
                {title}
              </span>
            </span>
          </button>
        );
      } else {
        panelTitle = (
          <KuiPopoverTitle>
            <span className="kuiContextMenu__itemLayout">
              {title}
            </span>
          </KuiPopoverTitle>
        );
      }
    }

    const classes = classNames('kuiContextMenuPanel', className, (
      this.state.isTransitioning && transitionDirectionAndTypeToClassNameMap[transitionDirection]
        ? transitionDirectionAndTypeToClassNameMap[transitionDirection][transitionType]
        : undefined
    ));

    const content = items.length
      ? items.map((MenuItem, index) => cloneElement(MenuItem, {
        buttonRef: this.menuItemRef.bind(this, index),
      }))
      : children;

    return (
      <div
        ref={this.panelRef}
        className={classes}
        onKeyDown={this.onKeyDown}
        tabIndex="0"
        onAnimationEnd={this.onTransitionComplete}
        {...rest}
      >
        {panelTitle}

        <div ref={this.contentRef}>
          {content}
        </div>
      </div>
    );
  }
}
