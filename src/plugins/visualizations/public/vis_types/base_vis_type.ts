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
import { VisToExpressionAst, VisualizationControllerConstructor } from '../types';
import { TriggerContextMapping } from '../../../ui_actions/public';
import { Adapters } from '../../../inspector/public';

export interface BaseVisTypeOptions {
  name: string;
  title: string;
  description?: string;
  getSupportedTriggers?: () => Array<keyof TriggerContextMapping>;
  icon?: string;
  image?: string;
  stage?: 'experimental' | 'beta' | 'production';
  options?: Record<string, any>;
  visualization: VisualizationControllerConstructor | undefined;
  visConfig?: Record<string, any>;
  editor?: any;
  editorConfig?: Record<string, any>;
  hidden?: boolean;
  requestHandler?: string | unknown;
  responseHandler?: string | unknown;
  hierarchicalData?: boolean | unknown;
  setup?: unknown;
  useCustomNoDataScreen?: boolean;
  inspectorAdapters?: Adapters | (() => Adapters);
  toExpressionAst?: VisToExpressionAst;
}

export class BaseVisType {
  name: string;
  title: string;
  description: string;
  getSupportedTriggers?: () => Array<keyof TriggerContextMapping>;
  icon?: string;
  image?: string;
  stage: 'experimental' | 'beta' | 'production';
  isExperimental: boolean;
  options: Record<string, any>;
  visualization: VisualizationControllerConstructor | undefined;
  visConfig: Record<string, any>;
  editor: any;
  editorConfig: Record<string, any>;
  hidden: boolean;
  requiresSearch: boolean;
  requestHandler: string | unknown;
  responseHandler: string | unknown;
  hierarchicalData: boolean | unknown;
  setup?: unknown;
  useCustomNoDataScreen: boolean;
  inspectorAdapters?: Adapters | (() => Adapters);
  toExpressionAst?: VisToExpressionAst;

  constructor(opts: BaseVisTypeOptions) {
    if (!opts.icon && !opts.image) {
      throw new Error('vis_type must define its icon or image');
    }

    const defaultOptions = {
      // controls the visualize editor
      showTimePicker: true,
      showQueryBar: true,
      showFilterBar: true,
      showIndexSelection: true,
      hierarchicalData: false, // we should get rid of this i guess ?
    };

    this.name = opts.name;
    this.description = opts.description || '';
    this.getSupportedTriggers = opts.getSupportedTriggers;
    this.title = opts.title;
    this.icon = opts.icon;
    this.image = opts.image;
    this.visualization = opts.visualization;
    this.visConfig = _.defaultsDeep({}, opts.visConfig, { defaults: {} });
    this.editor = opts.editor;
    this.editorConfig = _.defaultsDeep({}, opts.editorConfig, { collections: {} });
    this.options = _.defaultsDeep({}, opts.options, defaultOptions);
    this.stage = opts.stage || 'production';
    this.isExperimental = opts.stage === 'experimental';
    this.hidden = opts.hidden || false;
    this.requestHandler = opts.requestHandler || 'courier';
    this.responseHandler = opts.responseHandler || 'none';
    this.setup = opts.setup;
    this.requiresSearch = this.requestHandler !== 'none';
    this.hierarchicalData = opts.hierarchicalData || false;
    this.useCustomNoDataScreen = opts.useCustomNoDataScreen || false;
    this.inspectorAdapters = opts.inspectorAdapters;
    this.toExpressionAst = opts.toExpressionAst;
  }

  public get schemas() {
    if (this.editorConfig && this.editorConfig.schemas) {
      return this.editorConfig.schemas;
    }
    return [];
  }
}
