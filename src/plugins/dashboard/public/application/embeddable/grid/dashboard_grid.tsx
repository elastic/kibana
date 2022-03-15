/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// @ts-ignore
import sizeMe from 'react-sizeme';

import { injectI18n } from '@kbn/i18n-react';
import classNames from 'classnames';
import _ from 'lodash';
import React from 'react';
import { Subscription } from 'rxjs';
import ReactGridLayout, { Layout, ReactGridLayoutProps } from 'react-grid-layout';
import { GridData } from '../../../../common';
import { ViewMode } from '../../../services/embeddable';
import { DASHBOARD_GRID_COLUMN_COUNT, DASHBOARD_GRID_HEIGHT } from '../dashboard_constants';
import { DashboardPanelState } from '../types';
import { withKibana } from '../../../services/kibana_react';
import { DashboardContainer, DashboardReactContextValue } from '../dashboard_container';
import { DashboardGridItem } from './dashboard_grid_item';

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
  kibana: DashboardReactContextValue;
  container: DashboardContainer;
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
    try {
      layout = this.buildLayoutFromPanels();
    } catch (error) {
      console.error(error); // eslint-disable-line no-console

      isLayoutInvalid = true;
      this.props.kibana.notifications.toasts.danger({
        title: this.props.intl.formatMessage({
          id: 'dashboard.dashboardGrid.toast.unableToLoadDashboardDangerMessage',
          defaultMessage: 'Unable to load dashboard.',
        }),
        body: (error as { message: string }).message,
        toastLifeTimeMs: 5000,
      });
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

    const { container, kibana } = this.props;
    const { focusedPanelIndex, panels, expandedPanelId, viewMode } = this.state;
    const isViewMode = viewMode === ViewMode.VIEW;

    // Part of our unofficial API - need to render in a consistent order for plugins.
    const panelsInOrder = Object.keys(panels).map(
      (key: string) => panels[key] as DashboardPanelState
    );

    panelsInOrder.sort((panelA, panelB) => {
      if (panelA.gridData.y === panelB.gridData.y) {
        return panelA.gridData.x - panelB.gridData.x;
      } else {
        return panelA.gridData.y - panelB.gridData.y;
      }
    });

    const dashboardPanels = _.map(panelsInOrder, ({ explicitInput, type }, index) => (
      <DashboardGridItem
        key={explicitInput.id}
        id={explicitInput.id}
        index={index + 1}
        type={type}
        container={container}
        PanelComponent={kibana.services.embeddable.EmbeddablePanel}
        expandedPanelId={expandedPanelId}
        focusedPanelId={focusedPanelIndex}
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

export const DashboardGrid = injectI18n(withKibana(DashboardGridUi));
