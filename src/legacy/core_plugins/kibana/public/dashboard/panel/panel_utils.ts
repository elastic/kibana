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
import { SavedDashboardPanel } from '../types';

export class PanelUtils {
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
