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

import { defaultsDeep } from 'lodash';
import { ISchemas } from 'src/plugins/vis_default_editor/public';
import { VisParams } from '../types';
import { VisType, VisTypeOptions, VisGroups } from './types';

interface CommonBaseVisTypeOptions<TVisParams>
  extends Pick<
      VisType<TVisParams>,
      | 'description'
      | 'editor'
      | 'getInfoMessage'
      | 'getSupportedTriggers'
      | 'hierarchicalData'
      | 'icon'
      | 'image'
      | 'inspectorAdapters'
      | 'name'
      | 'requestHandler'
      | 'responseHandler'
      | 'setup'
      | 'title'
    >,
    Pick<
      Partial<VisType<TVisParams>>,
      | 'editorConfig'
      | 'hidden'
      | 'stage'
      | 'useCustomNoDataScreen'
      | 'visConfig'
      | 'group'
      | 'titleInWizard'
      | 'note'
    > {
  options?: Partial<VisType<TVisParams>['options']>;
}

interface ExpressionBaseVisTypeOptions<TVisParams> extends CommonBaseVisTypeOptions<TVisParams> {
  toExpressionAst: VisType<TVisParams>['toExpressionAst'];
  visualization?: undefined;
}

interface VisualizationBaseVisTypeOptions<TVisParams> extends CommonBaseVisTypeOptions<TVisParams> {
  toExpressionAst?: undefined;
  visualization: VisType<TVisParams>['visualization'];
}

export type BaseVisTypeOptions<TVisParams = VisParams> =
  | ExpressionBaseVisTypeOptions<TVisParams>
  | VisualizationBaseVisTypeOptions<TVisParams>;

const defaultOptions: VisTypeOptions = {
  showTimePicker: true,
  showQueryBar: true,
  showFilterBar: true,
  showIndexSelection: true,
  hierarchicalData: false, // we should get rid of this i guess ?
};

export class BaseVisType<TVisParams = VisParams> implements VisType<TVisParams> {
  public readonly name;
  public readonly title;
  public readonly description;
  public readonly note;
  public readonly getSupportedTriggers;
  public readonly icon;
  public readonly image;
  public readonly stage;
  public readonly group;
  public readonly titleInWizard;
  public readonly options;
  public readonly visualization;
  public readonly visConfig;
  public readonly editor;
  public readonly editorConfig;
  public hidden;
  public readonly requestHandler;
  public readonly responseHandler;
  public readonly hierarchicalData;
  public readonly setup;
  public readonly useCustomNoDataScreen;
  public readonly inspectorAdapters;
  public readonly toExpressionAst;
  public readonly getInfoMessage;

  constructor(opts: BaseVisTypeOptions<TVisParams>) {
    if (!opts.icon && !opts.image) {
      throw new Error('vis_type must define its icon or image');
    }

    this.name = opts.name;
    this.description = opts.description ?? '';
    this.note = opts.note ?? '';
    this.getSupportedTriggers = opts.getSupportedTriggers;
    this.title = opts.title;
    this.icon = opts.icon;
    this.image = opts.image;
    this.visualization = opts.visualization;
    this.visConfig = defaultsDeep({}, opts.visConfig, { defaults: {} });
    this.editor = opts.editor;
    this.editorConfig = defaultsDeep({}, opts.editorConfig, { collections: {} });
    this.options = defaultsDeep({}, opts.options, defaultOptions);
    this.stage = opts.stage ?? 'production';
    this.group = opts.group ?? VisGroups.AGGBASED;
    this.titleInWizard = opts.titleInWizard ?? '';
    this.hidden = opts.hidden ?? false;
    this.requestHandler = opts.requestHandler ?? 'courier';
    this.responseHandler = opts.responseHandler ?? 'none';
    this.setup = opts.setup;
    this.hierarchicalData = opts.hierarchicalData ?? false;
    this.useCustomNoDataScreen = opts.useCustomNoDataScreen ?? false;
    this.inspectorAdapters = opts.inspectorAdapters;
    this.toExpressionAst = opts.toExpressionAst;
    this.getInfoMessage = opts.getInfoMessage;
  }

  public get schemas(): ISchemas {
    return this.editorConfig?.schemas ?? [];
  }

  public get requiresSearch(): boolean {
    return this.requestHandler !== 'none';
  }
}
