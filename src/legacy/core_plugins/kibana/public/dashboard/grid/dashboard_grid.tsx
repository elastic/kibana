/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { injectI18n } from '@kbn/i18n/react';
import classNames from 'classnames';
import _ from 'lodash';
import React from 'react';
import ReactGridLayout, { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// @ts-ignore
import sizeMe from 'react-sizeme';
import { EmbeddableFactory } from 'ui/embeddable';
import { toastNotifications } from 'ui/notify';
import {
  DASHBOARD_GRID_COLUMN_COUNT,
  DASHBOARD_GRID_HEIGHT,
  DashboardConstants,
} from '../dashboard_constants';
import { DashboardViewMode } from '../dashboard_view_mode';
import { DashboardPanel } from '../panel';
import { PanelUtils } from '../panel/panel_utils';
import {
  GridData,
  SavedDashboardPanel,
  Pre61SavedDashboardPanel,
  SavedDashboardPanelMap,
} from '../types';

let lastValidGridSize = 0;

/**
 * This is a fix for a bug that stopped the browser window from automatically scrolling down when panels were made
 * taller than the current grid.
 * see https://github.com/elastic/kibana/issues/14710.
 */
function ensureWindowScrollsToBottom(event: { clientY: number; pageY: number }) {
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
}: {
  size: { width: number };
  isViewMode: boolean;
  layout: Layout[];
  onLayoutChange: () => void;
  children: JSX.Element[];
  maximizedPanelId: string;
  useMargins: boolean;
}) {
  // This is to prevent a bug where view mode changes when the panel is expanded.  View mode changes will trigger
  // the grid to re-render, but when a panel is expanded, the size will be 0. Minimizing the panel won't cause the
  // grid to re-render so it'll show a grid with a width of 0.
  lastValidGridSize = size.width > 0 ? size.width : lastValidGridSize;
  const classes = classNames({
    'dshLayout--viewing': isViewMode,
    'dshLayout--editing': !isViewMode,
    'dshLayout-isMaximizedPanel': maximizedPanelId !== undefined,
    'dshLayout-withoutMargins': !useMargins,
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
      // There is a bug with d3 + firefox + elements using transforms.
      // See https://github.com/elastic/kibana/issues/16870 for more context.
      useCSSTransforms={false}
      margin={[MARGINS, MARGINS]}
      cols={DASHBOARD_GRID_COLUMN_COUNT}
      rowHeight={DASHBOARD_GRID_HEIGHT}
      // Pass the named classes of what should get the dragging handle
      // (.doesnt-exist literally doesnt exist)
      draggableHandle={isViewMode ? '.doesnt-exist' : '.dshPanel__dragger'}
      layout={layout}
      onLayoutChange={onLayoutChange}
      onResize={({}, {}, {}, {}, event) => ensureWindowScrollsToBottom(event)}
    >
      {children}
    </ReactGridLayout>
  );
}

// Using sizeMe sets up the grid to be re-rendered automatically not only when the window size changes, but also
// when the container size changes, so it works for Full Screen mode switches.
const config = { monitorWidth: true };
const ResponsiveSizedGrid = sizeMe(config)(ResponsiveGrid);

interface Props extends ReactIntl.InjectedIntlProps {
  panels: SavedDashboardPanelMap;
  getEmbeddableFactory: (panelType: string) => EmbeddableFactory;
  dashboardViewMode: DashboardViewMode.EDIT | DashboardViewMode.VIEW;
  onPanelsUpdated: (updatedPanels: SavedDashboardPanelMap) => void;
  maximizedPanelId?: string;
  useMargins: boolean;
}

interface State {
  focusedPanelIndex?: string;
  isLayoutInvalid: boolean;
  layout?: GridData[];
}

interface PanelLayout extends Layout {
  i: string;
}

class DashboardGridUi extends React.Component<Props, State> {
  // A mapping of panelIndexes to grid items so we can set the zIndex appropriately on the last focused
  // item.
  private gridItems = {} as { [key: string]: HTMLDivElement | null };

  // A mapping of panel type to embeddable handlers. Because this function reaches out of react and into angular,
  // if done in the render method, it appears to be triggering a scope.apply, which appears to be trigging a setState
  // call inside TSVB visualizations.  Moving the function out of render appears to fix the issue.  See
  // https://github.com/elastic/kibana/issues/14802 for more info.
  // This is probably a better implementation anyway so the handlers are cached.
  // @type {Object.<string, EmbeddableFactory>}
  private embeddableFactoryMap: { [s: string]: EmbeddableFactory } = {};

  constructor(props: Props) {
    super(props);

    let isLayoutInvalid = false;
    let layout;
    try {
      layout = this.buildLayoutFromPanels();
    } catch (error) {
      isLayoutInvalid = true;
      toastNotifications.addDanger({
        title: props.intl.formatMessage({
          id: 'kbn.dashboard.dashboardGrid.unableToLoadDashboardDangerMessage',
          defaultMessage: 'Unable to load dashboard.',
        }),
        text: error.message,
      });
      window.location.hash = DashboardConstants.LANDING_PAGE_PATH;
    }
    this.state = {
      focusedPanelIndex: undefined,
      layout,
      isLayoutInvalid,
    };
  }

  public buildLayoutFromPanels(): GridData[] {
    return _.map(this.props.panels, panel => {
      // panel version numbers added in 6.1. Any panel without version number is assumed to be 6.0.0
      const panelVersion =
        'version' in panel
          ? PanelUtils.parseVersion(panel.version)
          : PanelUtils.parseVersion('6.0.0');

      if (panelVersion.major < 6 || (panelVersion.major === 6 && panelVersion.minor < 1)) {
        panel = PanelUtils.convertPanelDataPre_6_1((panel as unknown) as Pre61SavedDashboardPanel);
      }

      if (panelVersion.major < 6 || (panelVersion.major === 6 && panelVersion.minor < 3)) {
        PanelUtils.convertPanelDataPre_6_3(panel as SavedDashboardPanel, this.props.useMargins);
      }

      return (panel as SavedDashboardPanel).gridData;
    });
  }

  public createEmbeddableFactoriesMap(panels: SavedDashboardPanelMap) {
    Object.values(panels).map(panel => {
      if (!this.embeddableFactoryMap[panel.type]) {
        this.embeddableFactoryMap[panel.type] = this.props.getEmbeddableFactory(panel.type);
      }
    });
  }

  public componentWillMount() {
    this.createEmbeddableFactoriesMap(this.props.panels);
  }

  public componentWillReceiveProps(nextProps: Props) {
    this.createEmbeddableFactoriesMap(nextProps.panels);
  }

  public onLayoutChange = (layout: PanelLayout[]) => {
    const { onPanelsUpdated, panels } = this.props;
    const updatedPanels = layout.reduce((updatedPanelsAcc: SavedDashboardPanelMap, panelLayout) => {
      updatedPanelsAcc[panelLayout.i] = {
        ...panels[panelLayout.i],
        panelIndex: panelLayout.i,
        gridData: _.pick(panelLayout, ['x', 'y', 'w', 'h', 'i']),
      };
      return updatedPanelsAcc;
    }, {});
    onPanelsUpdated(updatedPanels);
  };

  public onPanelFocused = (focusedPanelIndex: string): void => {
    this.setState({ focusedPanelIndex });
  };

  public onPanelBlurred = (blurredPanelIndex: string): void => {
    if (this.state.focusedPanelIndex === blurredPanelIndex) {
      this.setState({ focusedPanelIndex: undefined });
    }
  };

  public renderDOM() {
    const { panels, maximizedPanelId } = this.props;
    const { focusedPanelIndex } = this.state;

    // Part of our unofficial API - need to render in a consistent order for plugins.
    const panelsInOrder = Object.keys(panels).map(
      (key: string) => panels[key] as SavedDashboardPanel
    );
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
        'dshDashboardGrid__item--expanded': expandPanel,
        'dshDashboardGrid__item--hidden': hidePanel,
      });
      return (
        <div
          style={{ zIndex: focusedPanelIndex === panel.panelIndex ? 2 : 'auto' }}
          className={classes}
          key={panel.panelIndex}
          ref={reactGridItem => {
            this.gridItems[panel.panelIndex] = reactGridItem;
          }}
        >
          <DashboardPanel
            panelId={panel.panelIndex}
            embeddableFactory={this.embeddableFactoryMap[panel.type]}
            onPanelFocused={this.onPanelFocused}
            onPanelBlurred={this.onPanelBlurred}
          />
        </div>
      );
    });
  }

  public render() {
    if (this.state.isLayoutInvalid) {
      return null;
    }

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

export const DashboardGrid = injectI18n(DashboardGridUi);
