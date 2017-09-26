import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import ReactGridLayout from 'react-grid-layout';
import { PanelUtils } from '../panel/panel_utils';
import { DashboardViewMode } from '../dashboard_view_mode';
import { DashboardPanelContainer } from '../panel/dashboard_panel_container';
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
      draggableHandle=".panel-heading"
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
  state = {
    layout: this.buildLayoutFromPanels()
  };

  buildLayoutFromPanels() {
    return _.map(this.props.panels, panel => {
      if (panel.size_x || panel.size_y || panel.col || panel.row) {
        PanelUtils.convertOldPanelData(panel);
      }
      return panel.gridData;
    });
  }

  onLayoutChange = (layout) => {
    const { onPanelUpdated } = this.props;
    layout.forEach(panelLayout => {
      const updatedPanel = {
        panelIndex: panelLayout.i,
        gridData: {
          x: panelLayout.x,
          y: panelLayout.y,
          w: panelLayout.w,
          h: panelLayout.h,
          i: panelLayout.i,
        },
        version: panelLayout.version
      };
      onPanelUpdated(updatedPanel);
    });
  };

  renderDOM() {
    const {
      panels,
      getEmbeddableHandler,
      getContainerApi,
    } = this.props;

    // Part of our unofficial API - need to render in a consistent order for plugins.
    const panelsInOrder = Object.values(panels);
    panelsInOrder.sort((panelA, panelB) => {
      if (panelA.gridData.y === panelB.gridData.y) {
        return panelA.gridData.x - panelB.gridData.x;
      } else {
        return panelA.gridData.y - panelB.gridData.y;
      }
    });

    return _.map(panelsInOrder, panel => {
      return (
        <div key={panel.panelIndex.toString()}>
          <DashboardPanelContainer
            panelId={panel.panelIndex}
            getContainerApi={getContainerApi}
            embeddableHandler={getEmbeddableHandler(panel.type)}
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
  panels: PropTypes.object.isRequired,
  getContainerApi: PropTypes.func.isRequired,
  getEmbeddableHandler: PropTypes.func.isRequired,
  dashboardViewMode: PropTypes.oneOf([DashboardViewMode.EDIT, DashboardViewMode.VIEW]).isRequired,
  onPanelUpdated: PropTypes.func.isRequired,
};

