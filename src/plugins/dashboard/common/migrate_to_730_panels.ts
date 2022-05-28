/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { SerializableRecord } from '@kbn/utility-types';
import semverSatisfies from 'semver/functions/satisfies';
import uuid from 'uuid';
import {
  GridData,
  SavedDashboardPanelTo60,
  SavedDashboardPanel620,
  SavedDashboardPanel630,
  SavedDashboardPanel610,
} from '.';
import {
  RawSavedDashboardPanelTo60,
  RawSavedDashboardPanel630,
  RawSavedDashboardPanel640To720,
  RawSavedDashboardPanel730ToLatest,
  RawSavedDashboardPanel610,
  RawSavedDashboardPanel620,
} from './bwc/types';

const PANEL_HEIGHT_SCALE_FACTOR = 5;
const PANEL_HEIGHT_SCALE_FACTOR_WITH_MARGINS = 4;
const PANEL_WIDTH_SCALE_FACTOR = 4;

/**
 * Note!
 *
 * The 7.3.0 migrations reference versions that are quite old because for a long time all of this
 * migration logic was done ad hoc in the code itself, not on the indexed data (migrations didn't even
 * exist at the point most of that logic was put in place).
 *
 * So you could have a dashboard in 7.2.0 that was created in 6.3 and it will have data of a different
 * shape than some other dashboards that were created more recently.
 *
 * Moving forward migrations should be simpler since all 7.3.0+ dashboards should finally have the
 * same data.
 */

function isPre61Panel(
  panel: unknown | RawSavedDashboardPanelTo60
): panel is RawSavedDashboardPanelTo60 {
  return (panel as RawSavedDashboardPanelTo60).row !== undefined;
}

function is61Panel(panel: unknown | RawSavedDashboardPanel610): panel is RawSavedDashboardPanel610 {
  return semverSatisfies((panel as RawSavedDashboardPanel610).version, '6.1.x');
}

function is62Panel(panel: unknown | RawSavedDashboardPanel620): panel is RawSavedDashboardPanel620 {
  return semverSatisfies((panel as RawSavedDashboardPanel620).version, '6.2.x');
}

function is63Panel(panel: unknown | RawSavedDashboardPanel630): panel is RawSavedDashboardPanel630 {
  return semverSatisfies((panel as RawSavedDashboardPanel630).version, '6.3.x');
}

function is640To720Panel(
  panel: unknown | RawSavedDashboardPanel640To720
): panel is RawSavedDashboardPanel640To720 {
  return (
    semverSatisfies((panel as RawSavedDashboardPanel630).version, '>6.3') &&
    semverSatisfies((panel as RawSavedDashboardPanel630).version, '<7.3')
  );
}

// Migrations required for 6.0 and prior:
// 1. (6.1) migrate size_x/y/row/col into gridData
// 2. (6.2) migrate uiState into embeddableConfig
// 3. (6.3) scale grid dimensions
// 4. (6.4) remove columns, sort properties
// 5. (7.3) make sure panelIndex is a string
function migratePre61PanelToLatest(
  panel: RawSavedDashboardPanelTo60,
  version: string,
  useMargins: boolean,
  uiState?: { [key: string]: SerializableRecord }
): RawSavedDashboardPanel730ToLatest {
  if (panel.col === undefined || panel.row === undefined) {
    throw new Error(
      i18n.translate('dashboard.panel.unableToMigratePanelDataForSixOneZeroErrorMessage', {
        defaultMessage:
          'Unable to migrate panel data for "6.1.0" backwards compatibility, panel does not contain expected col and/or row fields',
      })
    );
  }

  const embeddableConfig = uiState ? uiState[`P-${panel.panelIndex}`] || {} : {};

  if (panel.columns || panel.sort) {
    embeddableConfig.columns = panel.columns;
    embeddableConfig.sort = panel.sort;
  }

  const heightScaleFactor = useMargins
    ? PANEL_HEIGHT_SCALE_FACTOR_WITH_MARGINS
    : PANEL_HEIGHT_SCALE_FACTOR;

  // These are snapshotted here instead of imported from dashboard because
  // this function is called from both client and server side, and having an import from a public
  // folder will cause errors for the server side version.  Also, this is only run for the point in time
  // from panels created in < 7.3 so maybe using a snapshot of the default values when this migration was
  // written is more correct anyway.
  const DASHBOARD_GRID_COLUMN_COUNT = 48;
  const DEFAULT_PANEL_WIDTH = DASHBOARD_GRID_COLUMN_COUNT / 2;
  const DEFAULT_PANEL_HEIGHT = 15;

  const { columns, sort, row, col, size_x: sizeX, size_y: sizeY, ...rest } = panel;

  const panelIndex = panel.panelIndex ? panel.panelIndex.toString() : uuid.v4();
  return {
    ...rest,
    version,
    panelIndex,
    gridData: {
      x: (col - 1) * PANEL_WIDTH_SCALE_FACTOR,
      y: (row - 1) * heightScaleFactor,
      w: sizeX ? sizeX * PANEL_WIDTH_SCALE_FACTOR : DEFAULT_PANEL_WIDTH,
      h: sizeY ? sizeY * heightScaleFactor : DEFAULT_PANEL_HEIGHT,
      i: panelIndex,
    },
    embeddableConfig,
  };
}

// Migrations required for 6.1 panels:
// 1. (6.2) migrate uiState into embeddableConfig
// 2. (6.3) scale grid dimensions
// 3. (6.4) remove columns, sort properties
// 4. (7.3) make sure panel index is a string
function migrate610PanelToLatest(
  panel: RawSavedDashboardPanel610,
  version: string,
  useMargins: boolean,
  uiState?: { [key: string]: SerializableRecord }
): RawSavedDashboardPanel730ToLatest {
  (['w', 'x', 'h', 'y'] as Array<keyof GridData>).forEach((key) => {
    if (panel.gridData[key] === undefined) {
      throw new Error(
        i18n.translate('dashboard.panel.unableToMigratePanelDataForSixThreeZeroErrorMessage', {
          defaultMessage:
            'Unable to migrate panel data for "6.3.0" backwards compatibility, panel does not contain expected field: {key}',
          values: { key },
        })
      );
    }
  });

  const embeddableConfig = uiState ? uiState[`P-${panel.panelIndex}`] || {} : {};

  // 2. (6.4) remove columns, sort properties
  if (panel.columns || panel.sort) {
    embeddableConfig.columns = panel.columns;
    embeddableConfig.sort = panel.sort;
  }

  // 1. (6.3) scale grid dimensions
  const heightScaleFactor = useMargins
    ? PANEL_HEIGHT_SCALE_FACTOR_WITH_MARGINS
    : PANEL_HEIGHT_SCALE_FACTOR;
  const { columns, sort, ...rest } = panel;

  const panelIndex = panel.panelIndex ? panel.panelIndex.toString() : uuid.v4();
  return {
    ...rest,
    version,
    panelIndex,
    gridData: {
      w: panel.gridData.w * PANEL_WIDTH_SCALE_FACTOR,
      h: panel.gridData.h * heightScaleFactor,
      x: panel.gridData.x * PANEL_WIDTH_SCALE_FACTOR,
      y: panel.gridData.y * heightScaleFactor,
      i: panel.gridData.i,
    },
    embeddableConfig,
  };
}

// Migrations required for 6.2 panels:
// 1. (6.3) scale grid dimensions
// 2. (6.4) remove columns, sort properties
// 3. (7.3) make sure panel index is a string
function migrate620PanelToLatest(
  panel: RawSavedDashboardPanel620,
  version: string,
  useMargins: boolean
): RawSavedDashboardPanel730ToLatest {
  // Migrate column, sort
  const embeddableConfig = panel.embeddableConfig || {};
  if (panel.columns || panel.sort) {
    embeddableConfig.columns = panel.columns;
    embeddableConfig.sort = panel.sort;
  }

  // Scale grid dimensions
  const heightScaleFactor = useMargins
    ? PANEL_HEIGHT_SCALE_FACTOR_WITH_MARGINS
    : PANEL_HEIGHT_SCALE_FACTOR;
  const { columns, sort, ...rest } = panel;

  const panelIndex = panel.panelIndex ? panel.panelIndex.toString() : uuid.v4();
  return {
    ...rest,
    version,
    panelIndex,
    gridData: {
      w: panel.gridData.w * PANEL_WIDTH_SCALE_FACTOR,
      h: panel.gridData.h * heightScaleFactor,
      x: panel.gridData.x * PANEL_WIDTH_SCALE_FACTOR,
      y: panel.gridData.y * heightScaleFactor,
      i: panel.gridData.i,
    },
    embeddableConfig,
  };
}

// Migrations required for 6.3 panels:
// 1. (6.4) remove columns, sort properties
// 2. (7.3) make sure panel index is a string
function migrate630PanelToLatest(
  panel: RawSavedDashboardPanel630,
  version: string
): RawSavedDashboardPanel730ToLatest {
  // Migrate column, sort
  const embeddableConfig = panel.embeddableConfig || {};
  if (panel.columns || panel.sort) {
    embeddableConfig.columns = panel.columns;
    embeddableConfig.sort = panel.sort;
  }

  const { columns, sort, ...rest } = panel;
  const panelIndex = panel.panelIndex ? panel.panelIndex.toString() : uuid.v4();
  return {
    ...rest,
    version,
    panelIndex,
    embeddableConfig,
  };
}

// Migrations required for 6.4 to 7.20 panels:
// 1. (7.3) make sure panel index is a string
function migrate640To720PanelsToLatest(
  panel: RawSavedDashboardPanel630,
  version: string
): RawSavedDashboardPanel730ToLatest {
  const panelIndex = panel.panelIndex ? panel.panelIndex.toString() : uuid.v4();
  return {
    ...panel,
    version,
    panelIndex,
  };
}

export function migratePanelsTo730(
  panels: Array<
    | RawSavedDashboardPanelTo60
    | RawSavedDashboardPanel610
    | RawSavedDashboardPanel620
    | RawSavedDashboardPanel630
    | RawSavedDashboardPanel640To720
    // We run these on post processed panels too for url BWC
    | SavedDashboardPanelTo60
    | SavedDashboardPanel610
    | SavedDashboardPanel620
    | SavedDashboardPanel630
  >,
  version: string,
  useMargins: boolean,
  uiState?: { [key: string]: SerializableRecord }
): RawSavedDashboardPanel730ToLatest[] {
  return panels.map((panel) => {
    if (isPre61Panel(panel)) {
      return migratePre61PanelToLatest(panel, version, useMargins, uiState);
    }

    if (is61Panel(panel)) {
      return migrate610PanelToLatest(panel, version, useMargins, uiState);
    }

    if (is62Panel(panel)) {
      return migrate620PanelToLatest(panel, version, useMargins);
    }

    if (is63Panel(panel)) {
      return migrate630PanelToLatest(panel, version);
    }

    if (is640To720Panel(panel)) {
      return migrate640To720PanelsToLatest(panel, version);
    }

    return panel as RawSavedDashboardPanel730ToLatest;
  });
}
