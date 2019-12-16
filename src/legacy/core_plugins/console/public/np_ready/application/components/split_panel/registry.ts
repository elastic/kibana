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

export interface PanelController {
  setWidth: (percent: number) => void;
  getWidth: () => number;
  width: number;
}

export class PanelRegistry {
  private panels: PanelController[] = [];

  registerPanel(panel: PanelController) {
    this.panels.push(panel);
  }

  getResizerNeighbours(idx: number) {
    return [this.panels[idx], this.panels[idx + 1]];
  }

  getPanels() {
    return this.panels;
  }
}
