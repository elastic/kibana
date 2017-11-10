import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import ReactGridLayout from 'react-grid-layout';
import classNames from 'classnames';

import { PanelUtils } from '../panel/panel_utils';
import { DashboardViewMode } from '../dashboard_view_mode';
import { DashboardPanel } from '../panel';
import { DASHBOARD_GRID_COLUMN_COUNT } from '../dashboard_constants';
import sizeMe from 'react-sizeme';

const config = { monitorWidth: true };
let lastValidGridSize = 0;

/**
 * This is a fix for a bug that stopped the browser window from automatically scrolling down when panels were made
 * taller than the current grid.
 * see https://github.com/elastic/kibana/issues/14710.
 */
function ensureWindowScrollsToBottom(layout, oldResizeItem, l, placeholder, event) {
  // The buffer is to handle the case where the browser is maximized and it's impossible for the mouse to move below
  // the screen, out of the window.  see https://github.com/elastic/kibana/issues/14737
  const WINDOW_BUFFER = 10;
  if (event.clientY > window.innerHeight - WINDOW_BUFFER) {
    window.scrollTo(0, event.pageY + WINDOW_BUFFER - window.innerHeight);
  }
}

function ResponsiveGrid({
  size,
  isViewMode,
  layout,
  onLayoutChange,
  children,
  maximizedPanelId,
  useMargins,
}) {
  // This is to prevent a bug where view mode changes when the panel is expanded.  View mode changes will trigger
  // the grid to re-render, but when a panel is expanded, the size will be 0. Minimizing the panel won't cause the
  // grid to re-render so it'll show a grid with a width of 0.
  lastValidGridSize = size.width > 0 ? size.width : lastValidGridSize;
  const classes = classNames({
    'layout-view': isViewMode,
    'layout-edit': !isViewMode,
    'layout-maximized-panel': maximizedPanelId !== undefined,
    'layout-with-margins': useMargins,
  });

  const MARGINS = useMargins ? 8 : 0;
  // We can't take advantage of isDraggable or isResizable due to performance concerns:
  // https://github.com/STRML/react-grid-layout/issues/240
  return (
    <ReactGridLayout
      width={lastValidGridSize}
      className={classes}
      isDraggable={true}
      isResizable={true}
      margin={[MARGINS, MARGINS]}
      cols={DASHBOARD_GRID_COLUMN_COUNT}
      rowHeight={100}
      draggableHandle={isViewMode ? '.doesnt-exist' : '.panel-title'}
      layout={layout}
      onLayoutChange={onLayoutChange}
      measureBeforeMount={false}
      onResize={ensureWindowScrollsToBottom}
    >
      {children}
    </ReactGridLayout>
  );
}

// Using sizeMe sets up the grid to be re-rendered automatically not only when the window size changes, but also
// when the container size changes, so it works for Full Screen mode switches.
const ResponsiveSizedGrid = sizeMe(config)(ResponsiveGrid);


export class DashboardGrid extends React.Component {
  constructor(props) {
    super(props);
    // A mapping of panelIndexes to grid items so we can set the zIndex appropriately on the last focused
    // item.
    this.gridItems = {};
    this.state = {
      layout: this.buildLayoutFromPanels()
    };
    // A mapping of panel type to embeddable handlers. Because this function reaches out of react and into angular,
    // if done in the render method, it appears to be triggering a scope.apply, which appears to be trigging a setState
    // call inside TSVB visualizations.  Moving the function out of render appears to fix the issue.  See
    // https://github.com/elastic/kibana/issues/14802 for more info.
    // This is probably a better implementation anyway so the handlers are cached.
    // @type {Object.<string, EmbeddableFactory>}
    this.embeddableFactoryMap = {};
  }

  buildLayoutFromPanels() {
    return _.map(this.props.panels, panel => {
      if (!panel.version) {
        PanelUtils.convertOldPanelData(panel);
      }
      return panel.gridData;
    });
  }

  createEmbeddableFactoriesMap(panels) {
    Object.values(panels).map(panel => {
      if (!this.embeddableFactoryMap[panel.type]) {
        this.embeddableFactoryMap[panel.type] = this.props.getEmbeddableFactory(panel.type);
      }
    });
  }

  componentWillMount() {
    this.createEmbeddableFactoriesMap(this.props.panels);
  }

  componentWillReceiveProps(nextProps) {
    this.createEmbeddableFactoriesMap(nextProps.panels);
  }

  onLayoutChange = (layout) => {
    const { onPanelsUpdated } = this.props;
    const updatedPanels = [];
    layout.forEach(panelLayout => {
      const updatedPanel = {
        panelIndex: panelLayout.i,
        gridData: {
          x: panelLayout.x,
          y: panelLayout.y,
          w: panelLayout.w,
          h: panelLayout.h,
          i: panelLayout.i,
        }
      };
      updatedPanels.push(updatedPanel);
    });
    onPanelsUpdated(updatedPanels);
  };

  onPanelFocused = panelIndex => {
    const gridItem = this.gridItems[panelIndex];
    if (gridItem) {
      gridItem.style.zIndex = '1';
    }
  };

  onPanelBlurred = panelIndex => {
    const gridItem = this.gridItems[panelIndex];
    if (gridItem) {
      gridItem.style.zIndex = 'auto';
    }
  };

  renderDOM() {
    const {
      panels,
      getContainerApi,
      maximizedPanelId
    } = this.props;

    // Part of our unofficial API - need to render in a consistent order for plugins.
    const panelsInOrder = Object.keys(panels).map(key => panels[key]);
    panelsInOrder.sort((panelA, panelB) => {
      if (panelA.gridData.y === panelB.gridData.y) {
        return panelA.gridData.x - panelB.gridData.x;
      } else {
        return panelA.gridData.y - panelB.gridData.y;
      }
    });

    return _.map(panelsInOrder, panel => {
      const expandPanel = maximizedPanelId !== undefined && maximizedPanelId === panel.panelIndex;
      const hidePanel = maximizedPanelId !== undefined && maximizedPanelId !== panel.panelIndex;
      const classes = classNames({
        'grid-item--expanded': expandPanel,
        'grid-item--hidden': hidePanel,
      });
      return (
        <div
          className={classes}
          key={panel.panelIndex}
          ref={reactGridItem => { this.gridItems[panel.panelIndex] = reactGridItem; }}
        >
          <DashboardPanel
            panelId={panel.panelIndex}
            getContainerApi={getContainerApi}
            embeddableFactory={this.embeddableFactoryMap[panel.type]}
            onPanelFocused={this.onPanelFocused}
            onPanelBlurred={this.onPanelBlurred}
          />
        </div>
      );
    });
  }

  render() {
    const { dashboardViewMode, maximizedPanelId, useMargins } = this.props;
    const isViewMode = dashboardViewMode === DashboardViewMode.VIEW;
    return (
      <ResponsiveSizedGrid
        isViewMode={isViewMode}
        layout={this.buildLayoutFromPanels()}
        onLayoutChange={this.onLayoutChange}
        maximizedPanelId={maximizedPanelId}
        useMargins={useMargins}
      >
        {this.renderDOM()}
      </ResponsiveSizedGrid>
    );
  }
}

DashboardGrid.propTypes = {
  panels: PropTypes.object.isRequired,
  getContainerApi: PropTypes.func.isRequired,
  getEmbeddableFactory: PropTypes.func.isRequired,
  dashboardViewMode: PropTypes.oneOf([DashboardViewMode.EDIT, DashboardViewMode.VIEW]).isRequired,
  onPanelsUpdated: PropTypes.func.isRequired,
  maximizedPanelId: PropTypes.string,
  useMargins: PropTypes.bool.isRequired,
};
