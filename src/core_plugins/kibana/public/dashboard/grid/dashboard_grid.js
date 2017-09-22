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

function ResponsiveGrid({ size, isViewMode, buildLayoutFromPanels, onLayoutChange, children }) {
  return (
    <ReactGridLayout
      width={size.width}
      className="layout"
      isDraggable={isViewMode}
      isResizable={isViewMode}
      margin={[0, 0]}
      cols={DASHBOARD_GRID_COLUMN_COUNT}
      rowHeight={100}
      draggableHandle=".panel-title"
      layout={buildLayoutFromPanels}
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
        version: panelLayout.version
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
    const isViewMode = dashboardViewMode === DashboardViewMode.EDIT;
    return (
      <ResponsiveSizedGrid
        isViewMode={isViewMode}
        buildLayoutFromPanels={this.buildLayoutFromPanels()}
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

