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

export interface ContainerState {
  // 'view' or 'edit'. Should probably be an enum but I'm undecided where to define it, here or in dashboard code.
  viewMode: string;

  timeRange: {
    // To and From should be either an absolute time range in utc format or a relative one (e.g. now-15m)
    to: string;
    from: string;
  };

  // The shape will be up to the embeddable type.
  embeddableCustomization?: object;

  /**
   * Whether or not panel titles are hidden. It is not the embeddable's responsibility to hide the title (the container
   * handles that). This information is currently only used to determine the title for reporting (data-sharing-title
   * attribute). If we move that out of the embeddables and push it to the container (as we probably should), then
   * we shouldn't need to expose this information.
   */
  hidePanelTitles: boolean;

  /**
   * Is the current panel in expanded mode
   */
  isPanelExpanded: boolean;
}

export interface EmbeddableState {
  /**
   * Any customization data that should be stored at the panel level. For
   * example, pie slice colors, or custom per panel sort order or columns.
   */
  customization: object;
  /**
   * A possible filter the embeddable wishes dashboard to apply.
   */
  stagedFilter: object;
}
