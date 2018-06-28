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

import _ from 'lodash';
// @ts-ignore: implicit any for JS file
import chrome from 'ui/chrome';
import uuid from 'uuid';
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_WIDTH } from '../dashboard_constants';

import { PanelState, PanelStatePre61 } from '../types';

const PANEL_HEIGHT_SCALE_FACTOR_WITH_MARGINS = 4;
const PANEL_HEIGHT_SCALE_FACTOR = 5;
const PANEL_WIDTH_SCALE_FACTOR = 4;

export class PanelUtils {
  // 6.1 switched from gridster to react grid. React grid uses different variables for tracking layout
  public static convertPanelDataPre_6_1(panel: PanelStatePre61): PanelState {
    // eslint-disable-line camelcase
    ['col', 'row'].forEach(key => {
      if (!_.has(panel, key)) {
        throw new Error(
          `Unable to migrate panel data for "6.1.0" backwards compatibility, panel does not contain expected field: ${key}`
        );
      }
    });

    const newPanel = {
      embeddableConfig: panel.embeddableConfig || {},
      gridData: {
        h: panel.size_y || DEFAULT_PANEL_HEIGHT,
        i: panel.panelIndex.toString(),
        w: panel.size_x || DEFAULT_PANEL_WIDTH,
        x: panel.col - 1,
        y: panel.row - 1,
      },
      id: panel.id,
      panelIndex: panel.panelIndex.toString(),
      type: panel.type,
      version: chrome.getKibanaVersion(),
    };

    return newPanel;
  }

  // 6.3 changed the panel dimensions to allow finer control over sizing
  // 1) decrease column height from 100 to 20.
  // 2) increase rows from 12 to 48
  // Need to scale pre 6.3 panels so they maintain the same layout
  public static convertPanelDataPre_6_3(panel: PanelState, useMargins: boolean): PanelState {
    // eslint-disable-line camelcase
    ['w', 'x', 'h', 'y'].forEach(key => {
      if (!_.has(panel.gridData, key)) {
        throw new Error(
          `Unable to migrate panel data for "6.3.0" backwards compatibility, panel does not contain expected field: ${key}`
        );
      }
    });

    // see https://github.com/elastic/kibana/issues/20635 on why the scale factor changes when margins are being used
    const heightScaleFactor = useMargins
      ? PANEL_HEIGHT_SCALE_FACTOR_WITH_MARGINS
      : PANEL_HEIGHT_SCALE_FACTOR;

    const newPanel = {
      ...panel,
      gridData: {
        h: panel.gridData.h * PANEL_HEIGHT_SCALE_FACTOR,
        i: panel.gridData.i,
        w: panel.gridData.w * PANEL_WIDTH_SCALE_FACTOR,
        x: panel.gridData.x * PANEL_WIDTH_SCALE_FACTOR,
        y: panel.gridData.y * PANEL_HEIGHT_SCALE_FACTOR,
      },
      version: chrome.getKibanaVersion(),
    };
    return panel;
  }

  public static parseVersion(version = '6.0.0'): { major: number; minor: number } {
    const versionSplit = version.split('.');
    if (versionSplit.length < 3) {
      throw new Error(`Invalid version, ${version}, expected <major>.<minor>.<patch>`);
    }
    return {
      major: parseInt(versionSplit[0], 10),
      minor: parseInt(versionSplit[1], 10),
    };
  }

  /**
   * Loops through the panels array, making sure all of them have panelIndex initialized.
   * I suspect this is only be neccessary for bwc because old dashboards could have panelIndex
   * missing. TODO: once we have index migrations in place, we can clean this up.
   * @param panels
   */
  public static ensurePanelIndexes(panels: PanelState[]): PanelState[] {
    const newPanels: PanelState[] = [];

    // ensure that all panels have a panelIndex
    panels.forEach(panel => {
      if (!panel.panelIndex) {
        newPanels.push({
          ...panel,
          panelIndex: uuid.v1(),
        });
      } else {
        newPanels.push(panel);
      }
    });
    return newPanels;
  }
}
