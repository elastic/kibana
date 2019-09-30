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

import { Status } from '../update_status';
import { Vis } from '..';
export { VisType } from '../../../../core_plugins/visualizations/public';

export declare class VisualizationController {
  constructor(element: HTMLElement, vis: Vis);
  public render(visData: any, visParams: any, update: { [key in Status]: boolean }): Promise<void>;
  public destroy(): void;
  public isLoaded?(): Promise<void> | void;
}
