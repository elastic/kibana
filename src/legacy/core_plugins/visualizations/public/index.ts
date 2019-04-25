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

import { VisFiltersService, VisFiltersSetup } from './vis_filters';
import { VisTypesService, VisTypesSetup } from './vis_types';

class VisualizationsPlugin {
  private readonly visFilters: VisFiltersService;
  private readonly visTypes: VisTypesService;

  constructor() {
    this.visFilters = new VisFiltersService();
    this.visTypes = new VisTypesService();
  }

  public setup() {
    return {
      visFilters: this.visFilters.setup(),
      visTypes: this.visTypes.setup(),
    };
  }

  public stop() {
    this.visFilters.stop();
    this.visTypes.stop();
  }
}

/**
 * We export visualizations here so that users importing from 'plugins/visualizations'
 * will automatically receive the response value of the `setup` contract, mimicking
 * the data that will eventually be injected by the new platform.
 */
export const visualizations = new VisualizationsPlugin().setup();

/** @public */
export interface VisualizationsSetup {
  visFilters: VisFiltersSetup;
  visTypes: VisTypesSetup;
}

/** @public types */
export {
  Vis,
  VisParams,
  VisProvider,
  VisState,
  VisualizationController,
  VisType,
  VisTypesRegistry,
} from './vis_types';
