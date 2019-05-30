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

import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import chrome from 'ui/chrome';
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_WIDTH } from '../dashboard_constants';
import { GridData, SavedDashboardPanel } from '../types';

const PANEL_HEIGHT_SCALE_FACTOR = 5;
const PANEL_HEIGHT_SCALE_FACTOR_WITH_MARGINS = 4;
const PANEL_WIDTH_SCALE_FACTOR = 4;

export interface SemanticVersion {
  major: number;
  minor: number;
}

export class PanelUtils {
  // 6.1 switched from gridster to react grid. React grid uses different variables for tracking layout
  // eslint-disable-next-line @typescript-eslint/camelcase
  public static convertPanelDataPre_6_1(panel: any): SavedDashboardPanel {
    ['col', 'row'].forEach(key => {
      if (!_.has(panel, key)) {
        throw new Error(
          i18n.translate('kbn.dashboard.panel.unableToMigratePanelDataForSixOneZeroErrorMessage', {
            defaultMessage:
              'Unable to migrate panel data for "6.1.0" backwards compatibility, panel does not contain expected field: {key}',
            values: { key },
          })
        );
      }
    });

    panel.gridData = {
      x: panel.col - 1,
      y: panel.row - 1,
      w: panel.size_x || DEFAULT_PANEL_WIDTH,
      h: panel.size_y || DEFAULT_PANEL_HEIGHT,
      i: panel.panelIndex.toString(),
    };
    panel.version = chrome.getKibanaVersion();
    panel.panelIndex = panel.panelIndex.toString();
    delete panel.size_x;
    delete panel.size_y;
    delete panel.row;
    delete panel.col;

    return panel;
  }

  // 6.3 changed the panel dimensions to allow finer control over sizing
  // 1) decrease column height from 100 to 20.
  // 2) increase rows from 12 to 48
  // Need to scale pre 6.3 panels so they maintain the same layout
  // eslint-disable-next-line @typescript-eslint/camelcase
  public static convertPanelDataPre_6_3(
    panel: {
      gridData: GridData;
      version: string;
    },
    useMargins: boolean
  ) {
    ['w', 'x', 'h', 'y'].forEach(key => {
      if (!_.has(panel.gridData, key)) {
        throw new Error(
          i18n.translate(
            'kbn.dashboard.panel.unableToMigratePanelDataForSixThreeZeroErrorMessage',
            {
              defaultMessage:
                'Unable to migrate panel data for "6.3.0" backwards compatibility, panel does not contain expected field: {key}',
              values: { key },
            }
          )
        );
      }
    });

    // see https://github.com/elastic/kibana/issues/20635 on why the scale factor changes when margins are being used
    const heightScaleFactor = useMargins
      ? PANEL_HEIGHT_SCALE_FACTOR_WITH_MARGINS
      : PANEL_HEIGHT_SCALE_FACTOR;

    panel.gridData.w = panel.gridData.w * PANEL_WIDTH_SCALE_FACTOR;
    panel.gridData.x = panel.gridData.x * PANEL_WIDTH_SCALE_FACTOR;
    panel.gridData.h = panel.gridData.h * heightScaleFactor;
    panel.gridData.y = panel.gridData.y * heightScaleFactor;
    panel.version = chrome.getKibanaVersion();

    return panel;
  }

  public static parseVersion(version = '6.0.0'): SemanticVersion {
    const versionSplit = version.split('.');
    if (versionSplit.length < 3) {
      throw new Error(
        i18n.translate('kbn.dashboard.panel.invalidVersionErrorMessage', {
          defaultMessage: 'Invalid version, {version}, expected {semver}',
          values: {
            version,
            semver: '<major>.<minor>.<patch>',
          },
        })
      );
    }
    return {
      major: parseInt(versionSplit[0], 10),
      minor: parseInt(versionSplit[1], 10),
    };
  }

  public static initPanelIndexes(panels: SavedDashboardPanel[]): void {
    // find the largest panelIndex in all the panels
    let maxIndex = this.getMaxPanelIndex(panels);

    // ensure that all panels have a panelIndex
    panels.forEach(panel => {
      if (!panel.panelIndex) {
        panel.panelIndex = (maxIndex++).toString();
      }
    });
  }

  public static getMaxPanelIndex(panels: SavedDashboardPanel[]): number {
    let maxId = panels.reduce((id, panel) => {
      return Math.max(id, Number(panel.panelIndex || id));
    }, 0);
    return ++maxId;
  }
}
