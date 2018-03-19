import React, {
  Component,
} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { KuiContextMenuPanel } from './context_menu_panel';
import { KuiContextMenuItem } from './context_menu_item';

function mapIdsToPanels(panels) {
  const map = {};

  panels.forEach(panel => {
    map[panel.id] = panel;
  });

  return map;
}

function mapIdsToPreviousPanels(panels) {
  const idToPreviousPanelIdMap = {};

  panels.forEach(panel => {
    if (Array.isArray(panel.items)) {
      panel.items.forEach(item => {
        const isCloseable = item.panel !== undefined;
        if (isCloseable) {
          idToPreviousPanelIdMap[item.panel] = panel.id;
        }
      });
    }
  });

  return idToPreviousPanelIdMap;
}

function mapPanelItemsToPanels(panels) {
  const idAndItemIndexToPanelIdMap = {};

  panels.forEach(panel => {
    idAndItemIndexToPanelIdMap[panel.id] = {};

    if (panel.items) {
      panel.items.forEach((item, index) => {
        if (item.panel) {
          idAndItemIndexToPanelIdMap[panel.id][index] = item.panel;
        }
      });
    }
  });

  return idAndItemIndexToPanelIdMap;
}

export class KuiContextMenu extends Component {
  static propTypes = {
    className: PropTypes.string,
    panels: PropTypes.array,
    initialPanelId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }

  static defaultProps = {
    panels: [],
  }

  constructor(props) {
    super(props);

    this.idToPanelMap = {};
    this.idToPreviousPanelIdMap = {};
    this.idAndItemIndexToPanelIdMap = {};

    this.state = {
      height: undefined,
      outgoingPanelId: undefined,
      incomingPanelId: props.initialPanelId,
      transitionDirection: undefined,
      isOutgoingPanelVisible: false,
      focusedItemIndex: undefined,
      isUsingKeyboardToNavigate: false,
    };
  }

  hasPreviousPanel = panelId => {
    const previousPanelId = this.idToPreviousPanelIdMap[panelId];
    return typeof previousPanelId !== 'undefined';
  };

  showPanel(panelId, direction) {
    this.setState({
      outgoingPanelId: this.state.incomingPanelId,
      incomingPanelId: panelId,
      transitionDirection: direction,
      isOutgoingPanelVisible: true,
    });
  }

  showNextPanel = itemIndex => {
    const nextPanelId = this.idAndItemIndexToPanelIdMap[this.state.incomingPanelId][itemIndex];
    if (nextPanelId) {
      if (this.state.isUsingKeyboardToNavigate) {
        this.setState({
          focusedItemIndex: 0,
        });
      }

      this.showPanel(nextPanelId, 'next');
    }
  };

  showPreviousPanel = () => {
    // If there's a previous panel, then we can close the current panel to go back to it.
    if (this.hasPreviousPanel(this.state.incomingPanelId)) {
      const previousPanelId = this.idToPreviousPanelIdMap[this.state.incomingPanelId];

      // Set focus on the item which shows the panel we're leaving.
      const previousPanel = this.idToPanelMap[previousPanelId];
      const focusedItemIndex = previousPanel.items.findIndex(
        item => item.panel === this.state.incomingPanelId
      );

      if (focusedItemIndex !== -1) {
        this.setState({
          focusedItemIndex,
        });
      }

      this.showPanel(previousPanelId, 'previous');
    }
  };

  onIncomingPanelHeightChange = height => {
    this.setState({
      height,
    });
  };

  onOutGoingPanelTransitionComplete = () => {
    this.setState({
      isOutgoingPanelVisible: false,
    });
  };

  onUseKeyboardToNavigate = () => {
    if (!this.state.isUsingKeyboardToNavigate) {
      this.setState({
        isUsingKeyboardToNavigate: true,
      });
    }
  };

  updatePanelMaps(panels) {
    this.idToPanelMap = mapIdsToPanels(panels);
    this.idToPreviousPanelIdMap = mapIdsToPreviousPanels(panels);
    this.idAndItemIndexToPanelIdMap = mapPanelItemsToPanels(panels);
  }

  componentWillMount() {
    this.updatePanelMaps(this.props.panels);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.panels !== this.props.panels) {
      this.updatePanelMaps(nextProps.panels);
    }
  }

  renderItems(items = []) {
    return items.map((item, index) => {
      const {
        panel,
        name,
        icon,
        onClick,
        ...rest
      } = item;

      const onClickHandler = panel
        ? () => {
          // This component is commonly wrapped in a KuiOutsideClickDetector, which means we'll
          // need to wait for that logic to complete before re-rendering the DOM via showPanel.
          window.requestAnimationFrame(() => {
            if (onClick) onClick();
            this.showNextPanel(index);
          });
        } : onClick;

      return (
        <KuiContextMenuItem
          key={name}
          icon={icon}
          onClick={onClickHandler}
          hasPanel={Boolean(panel)}
          {...rest}
        >
          {name}
        </KuiContextMenuItem>
      );
    });
  }

  renderPanel(panelId, transitionType) {
    const panel = this.idToPanelMap[panelId];

    if (!panel) {
      return;
    }

    // As above, we need to wait for KuiOutsideClickDetector to complete its logic before
    // re-rendering via showPanel.
    let onClose;
    if (this.hasPreviousPanel(panelId)) {
      onClose = () => window.requestAnimationFrame(this.showPreviousPanel);
    }

    return (
      <KuiContextMenuPanel
        key={panelId}
        className="kuiContextMenu__panel"
        onHeightChange={(transitionType === 'in') ? this.onIncomingPanelHeightChange : undefined}
        onTransitionComplete={(transitionType === 'out') ? this.onOutGoingPanelTransitionComplete : undefined}
        title={panel.title}
        onClose={onClose}
        transitionType={this.state.isOutgoingPanelVisible ? transitionType : undefined}
        transitionDirection={this.state.isOutgoingPanelVisible ? this.state.transitionDirection : undefined}
        hasFocus={transitionType === 'in'}
        items={this.renderItems(panel.items)}
        initialFocusedItemIndex={this.state.isUsingKeyboardToNavigate ? this.state.focusedItemIndex : undefined}
        onUseKeyboardToNavigate={this.onUseKeyboardToNavigate}
        showNextPanel={this.showNextPanel}
        showPreviousPanel={this.showPreviousPanel}
      >
        {panel.content}
      </KuiContextMenuPanel>
    );
  }

  render() {
    const {
      panels, // eslint-disable-line no-unused-vars
      className,
      initialPanelId, // eslint-disable-line no-unused-vars
      ...rest
    } = this.props;

    const incomingPanel = this.renderPanel(this.state.incomingPanelId, 'in');
    let outgoingPanel;

    if (this.state.isOutgoingPanelVisible) {
      outgoingPanel = this.renderPanel(this.state.outgoingPanelId, 'out');
    }

    const classes = classNames('kuiContextMenu', className);

    return (
      <div
        ref={node => { this.menu = node; }}
        className={classes}
        style={{ height: this.state.height }}
        {...rest}
      >
        {outgoingPanel}
        {incomingPanel}
      </div>
    );
  }
}
