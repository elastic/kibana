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

import { IconType } from '@elastic/eui';
import { Status } from '../update_status';
import { Vis } from '..';

export declare class VisualizationController {
  constructor(element: HTMLElement, vis: Vis);
  public render(visData: any, visParams: any, update: { [key in Status]: boolean }): Promise<void>;
  public destroy(): void;
  public isLoaded?(): Promise<void> | void;
}

export interface VisType {
  name: string;
  title: string;
  description?: string;
  visualization: typeof VisualizationController;
  isAccessible?: boolean;
  requestHandler: string;
  responseHandler: string;
  icon?: IconType;
  image?: string;
  stage: 'experimental' | 'production';
  requiresSearch: boolean;
  hidden: boolean;

  // Since we haven't typed everything here yet, we basically "any" the rest
  // of that interface. This should be removed as soon as this type definition
  // has been completed. But that way we at least have typing for a couple of
  // properties on that type.
  [key: string]: any;
}
