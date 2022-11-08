/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import React from 'react';
import sizeMe from 'react-sizeme';
import classNames from 'classnames';
import { Subscription } from 'rxjs';
import 'react-resizable/css/styles.css';
import 'react-grid-layout/css/styles.css';
import ReactGridLayout, { Layout, ReactGridLayoutProps } from 'react-grid-layout';

import { injectI18n } from '@kbn/i18n-react';
import { ViewMode, EmbeddablePhaseEvent } from '@kbn/embeddable-plugin/public';

import { DashboardContainer, DashboardLoadedInfo } from '../dashboard_container';
import { GridData } from '../../../../common';
import { DashboardGridItem } from './dashboard_grid_item';
import { DashboardLoadedEventStatus, DashboardPanelState } from '../types';
import { DASHBOARD_GRID_COLUMN_COUNT, DASHBOARD_GRID_HEIGHT } from '../../../dashboard_constants';
import { pluginServices } from '../../../services/plugin_services';
import { dashboardSavedObjectErrorStrings } from '../../../dashboard_strings';

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
  onLayoutChange: ReactGridLayoutProps['onLayoutChange'];
  children: JSX.Element[];
  maximizedPanelId?: string;
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
      draggableHandle={isViewMode ? '.doesnt-exist' : '.embPanel__dragger'}
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

export interface DashboardGridProps extends ReactIntl.InjectedIntlProps {
  container: DashboardContainer;
  onDataLoaded?: (data: DashboardLoadedInfo) => void;
}

interface State {
  focusedPanelIndex?: string;
  isLayoutInvalid: boolean;
  layout?: GridData[];
  panels: { [key: string]: DashboardPanelState };
  viewMode: ViewMode;
  useMargins: boolean;
  expandedPanelId?: string;
}

interface PanelLayout extends Layout {
  i: string;
}

class DashboardGridUi extends React.Component<DashboardGridProps, State> {
  private subscription?: Subscription;
  private mounted: boolean = false;

  constructor(props: DashboardGridProps) {
    super(props);

    this.state = {
      layout: [],
      isLayoutInvalid: false,
      focusedPanelIndex: undefined,
      panels: this.props.container.getInput().panels,
      viewMode: this.props.container.getInput().viewMode,
      useMargins: this.props.container.getInput().useMargins,
      expandedPanelId: this.props.container.getInput().expandedPanelId,
    };
  }

  public componentDidMount() {
    this.mounted = true;
    let isLayoutInvalid = false;
    let layout;

    const {
      notifications: { toasts },
    } = pluginServices.getServices();

    try {
      layout = this.buildLayoutFromPanels();
    } catch (error) {
      console.error(error); // eslint-disable-line no-console
      isLayoutInvalid = true;
      toasts.addDanger(dashboardSavedObjectErrorStrings.getDashboardGridError(error.message));
    }
    this.setState({
      layout,
      isLayoutInvalid,
    });

    this.subscription = this.props.container.getInput$().subscribe(() => {
      const { panels, viewMode, useMargins, expandedPanelId } = this.props.container.getInput();
      if (this.mounted) {
        this.setState({
          panels,
          viewMode,
          useMargins,
          expandedPanelId,
        });
      }
    });
  }

  public componentWillUnmount() {
    this.mounted = false;
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  public buildLayoutFromPanels = (): GridData[] => {
    return _.map(this.state.panels, (panel) => {
      return panel.gridData;
    });
  };

  public onLayoutChange = (layout: PanelLayout[]) => {
    const panels = this.state.panels;
    const updatedPanels: { [key: string]: DashboardPanelState } = layout.reduce(
      (updatedPanelsAcc, panelLayout) => {
        updatedPanelsAcc[panelLayout.i] = {
          ...panels[panelLayout.i],
          gridData: _.pick(panelLayout, ['x', 'y', 'w', 'h', 'i']),
        };
        return updatedPanelsAcc;
      },
      {} as { [key: string]: DashboardPanelState }
    );
    this.onPanelsUpdated(updatedPanels);
  };

  public onPanelsUpdated = (panels: { [key: string]: DashboardPanelState }) => {
    this.props.container.updateInput({
      panels,
    });
  };

  public onPanelFocused = (focusedPanelIndex: string): void => {
    this.setState({ focusedPanelIndex });
  };

  public onPanelBlurred = (blurredPanelIndex: string): void => {
    if (this.state.focusedPanelIndex === blurredPanelIndex) {
      this.setState({ focusedPanelIndex: undefined });
    }
  };

  public render() {
    if (this.state.isLayoutInvalid) {
      return null;
    }

    const { container } = this.props;
    const { focusedPanelIndex, panels, expandedPanelId, viewMode } = this.state;
    const isViewMode = viewMode === ViewMode.VIEW;

    // Part of our unofficial API - need to render in a consistent order for plugins.
    const panelsInOrder = Object.keys(panels).map((key: string) => {
      return panels[key] as DashboardPanelState;
    });

    panelsInOrder.sort((panelA, panelB) => {
      if (panelA.gridData.y === panelB.gridData.y) {
        return panelA.gridData.x - panelB.gridData.x;
      } else {
        return panelA.gridData.y - panelB.gridData.y;
      }
    });

    const panelIds: Record<string, Record<string, number>> = {};
    const loadStartTime = performance.now();
    let lastTimeToData = 0;
    let status: DashboardLoadedEventStatus = 'done';
    let doneCount = 0;

    /**
     * Sends an event
     *
     * @param info
     * @returns
     */
    const onPanelStatusChange = (info: EmbeddablePhaseEvent) => {
      if (!this.props.onDataLoaded) return;

      if (panelIds[info.id] === undefined || info.status === 'loading') {
        panelIds[info.id] = {};
      } else if (info.status === 'error') {
        status = 'error';
      } else if (info.status === 'loaded') {
        lastTimeToData = performance.now();
      }

      panelIds[info.id][info.status] = performance.now();

      if (info.status === 'error' || info.status === 'rendered') {
        doneCount++;
        if (doneCount === panelsInOrder.length) {
          const doneTime = performance.now();
          const data: DashboardLoadedInfo = {
            timeToData: (lastTimeToData || doneTime) - loadStartTime,
            timeToDone: doneTime - loadStartTime,
            numOfPanels: panelsInOrder.length,
            status,
          };
          this.props.onDataLoaded(data);
        }
      }
    };

    const dashboardPanels = _.map(panelsInOrder, ({ explicitInput, type }, index) => (
      <DashboardGridItem
        key={explicitInput.id}
        id={explicitInput.id}
        index={index + 1}
        type={type}
        container={container}
        expandedPanelId={expandedPanelId}
        focusedPanelId={focusedPanelIndex}
        onPanelStatusChange={onPanelStatusChange}
      />
    ));

    // in print mode, dashboard layout is not controlled by React Grid Layout
    if (viewMode === ViewMode.PRINT) {
      return <>{dashboardPanels}</>;
    }

    return (
      <ResponsiveSizedGrid
        isViewMode={isViewMode}
        layout={this.buildLayoutFromPanels()}
        onLayoutChange={this.onLayoutChange}
        maximizedPanelId={expandedPanelId}
        useMargins={this.state.useMargins}
      >
        {dashboardPanels}
      </ResponsiveSizedGrid>
    );
  }
}

export const DashboardGrid = injectI18n(DashboardGridUi);
