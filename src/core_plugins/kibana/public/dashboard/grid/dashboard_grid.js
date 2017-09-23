import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import ReactGridLayout from 'react-grid-layout';
import { PanelUtils } from '../panel/panel_utils';
import { DashboardViewMode } from '../dashboard_view_mode';
import { DashboardPanel } from '../panel/dashboard_panel';
import { DASHBOARD_GRID_COLUMN_COUNT } from '../dashboard_constants';
import sizeMe from 'react-sizeme';

const config = { monitorWidth: true };
let lastValidGridSize = 0;

function ResponsiveGrid({ size, isViewMode, layout, onLayoutChange, children }) {
  // This is to prevent a bug where view mode changes when the panel is expanded.  View mode changes will trigger
  // the grid to re-render, but when a panel is expanded, the size will be 0. Minimizing the panel won't cause the
  // grid to re-render so it'll show a grid with a width of 0.
  lastValidGridSize = size.width > 0 ? size.width : lastValidGridSize;
  // We can't take advantage of isDraggable or isResizable due to performance concerns:
  // https://github.com/STRML/react-grid-layout/issues/240
  return (
    <ReactGridLayout
      width={lastValidGridSize}
      className={isViewMode ? 'layout-view' : 'layout-edit'}
      isDraggable={true}
      isResizable={true}
      margin={[0, 0]}
      cols={DASHBOARD_GRID_COLUMN_COUNT}
      rowHeight={100}
      draggableHandle={isViewMode ? '.doesnt-exist' : '.panel-title'}
      layout={layout}
      onLayoutChange={onLayoutChange}
      measureBeforeMount={false}
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
  }

  buildLayoutFromPanels() {
    return this.props.panels.map(panel => {
      if (panel.size_x || panel.size_y || panel.col || panel.row) {
        PanelUtils.convertOldPanelData(panel);
      }
      return panel.gridData;
    });
  }

  onLayoutChange = (layout) => {
    const { panels, getContainerApi } = this.props;
    const containerApi = getContainerApi();
    layout.forEach(panelLayout => {
      const panelUpdated = _.find(panels, panel => panel.panelIndex.toString() === panelLayout.i);
      panelUpdated.gridData = {
        x: panelLayout.x,
        y: panelLayout.y,
        w: panelLayout.w,
        h: panelLayout.h,
        i: panelLayout.i,
      };
      containerApi.updatePanel(panelUpdated.panelIndex, panelUpdated);
    });
  };

  onPanelFocused = panelIndex => {
    this.gridItems[panelIndex].style.zIndex = '1';
  };
  onPanelBlurred = panelIndex => {
    this.gridItems[panelIndex].style.zIndex = 'auto';
  };

  renderDOM() {
    const {
      panels,
      onPanelRemoved,
      expandPanel,
      isFullScreenMode,
      getEmbeddableHandler,
      getContainerApi,
      dashboardViewMode
    } = this.props;

    // Part of our unofficial API - need to render in a consistent order for plugins.
    const panelsInOrder = panels.slice(0);
    panelsInOrder.sort((panelA, panelB) => {
      if (panelA.gridData.y === panelB.gridData.y) {
        return panelA.gridData.x - panelB.gridData.x;
      } else {
        return panelA.gridData.y - panelB.gridData.y;
      }
    });

    return panelsInOrder.map(panel => {
      return (
        <div
          key={panel.panelIndex.toString()}
          ref={reactGridItem => { this.gridItems[panel.panelIndex] = reactGridItem; }}
        >
          <DashboardPanel
            panel={panel}
            onDeletePanel={onPanelRemoved}
            onToggleExpanded={expandPanel}
            isExpanded={false}
            isFullScreenMode={isFullScreenMode}
            getEmbeddableHandler={getEmbeddableHandler}
            getContainerApi={getContainerApi}
            dashboardViewMode={dashboardViewMode}
            onPanelFocused={this.onPanelFocused}
            onPanelBlurred={this.onPanelBlurred}
          />
        </div>
      );
    });
  }

  render() {
    const { dashboardViewMode } = this.props;
    const isViewMode = dashboardViewMode === DashboardViewMode.VIEW;
    return (
      <ResponsiveSizedGrid
        isViewMode={isViewMode}
        layout={this.buildLayoutFromPanels()}
        onLayoutChange={this.onLayoutChange}
      >
        {this.renderDOM()}
      </ResponsiveSizedGrid>
    );
  }
}

DashboardGrid.propTypes = {
  isFullScreenMode: PropTypes.bool.isRequired,
  panels: PropTypes.array.isRequired,
  getContainerApi: PropTypes.func.isRequired,
  getEmbeddableHandler: PropTypes.func.isRequired,
  dashboardViewMode: PropTypes.oneOf([DashboardViewMode.EDIT, DashboardViewMode.VIEW]).isRequired,
  expandPanel: PropTypes.func.isRequired,
  onPanelRemoved: PropTypes.func.isRequired,
};

