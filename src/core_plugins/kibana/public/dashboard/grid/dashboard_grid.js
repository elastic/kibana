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
let lastValidGridSize = 0;

function ResponsiveGrid({ size, isViewMode, layout, onLayoutChange, children, hidden }) {
  // This is to prevent a bug where view mode changes when the panel is expanded.  View mode changes will trigger
  // the grid to re-render, but when a panel is expanded, the size will be 0. Minimizing the panel won't cause the
  // grid to re-render so it'll show a grid with a width of 0.
  lastValidGridSize = size.width > 0 ? size.width : lastValidGridSize;
  let classNames = '';

  if (hidden) {
    classNames = 'layout-hidden';
  } else if (isViewMode) {
    classNames = 'layout-view';
  } else {
    classNames = 'layout-edit';
  }

  // We can't take advantage of isDraggable or isResizable due to performance concerns:
  // https://github.com/STRML/react-grid-layout/issues/240
  return (
    <ReactGridLayout
      width={lastValidGridSize}
      className={classNames}
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
    return _.map(this.props.panels, panel => {
      if (!panel.version) {
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
        }
      };
      onPanelUpdated(updatedPanel);
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
      getEmbeddableHandler,
      getContainerApi,
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
      return (
        <div
          key={panel.panelIndex.toString()}
          ref={reactGridItem => { this.gridItems[panel.panelIndex] = reactGridItem; }}
        >
          <DashboardPanelContainer
            panelId={`${panel.panelIndex}`}
            getContainerApi={getContainerApi}
            embeddableHandler={getEmbeddableHandler(panel.type)}
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
        hidden={this.props.hidden}
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
  hidden: PropTypes.bool
};
