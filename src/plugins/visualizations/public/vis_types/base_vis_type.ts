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

import { VisParams } from '../types';
import { VisTypeDefinition, VisTypeOptions, VisGroups } from './types';
import { Schemas } from './schemas';

const defaultOptions: VisTypeOptions = {
  showTimePicker: true,
  showQueryBar: true,
  showFilterBar: true,
  showIndexSelection: true,
  hierarchicalData: false, // we should get rid of this i guess ?
};

export class BaseVisType<TVisParams = VisParams> {
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
  public readonly options: VisTypeOptions;
  public readonly visConfig;
  public readonly editorConfig;
  public hidden;
  public readonly requiresSearch;
  public readonly hierarchicalData;
  public readonly setup;
  public readonly getUsedIndexPattern;
  public readonly inspectorAdapters;
  public readonly toExpressionAst;
  public readonly getInfoMessage;
  public readonly schemas;

  constructor(opts: VisTypeDefinition<TVisParams>) {
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
    this.visConfig = defaultsDeep({}, opts.visConfig, { defaults: {} });
    this.editorConfig = defaultsDeep({}, opts.editorConfig, { collections: {} });
    this.options = defaultsDeep({}, opts.options, defaultOptions);
    this.stage = opts.stage ?? 'production';
    this.group = opts.group ?? VisGroups.AGGBASED;
    this.titleInWizard = opts.titleInWizard ?? '';
    this.hidden = opts.hidden ?? false;
    this.requiresSearch = opts.requiresSearch ?? false;
    this.setup = opts.setup;
    this.hierarchicalData = opts.hierarchicalData ?? false;
    this.getUsedIndexPattern = opts.getUsedIndexPattern;
    this.inspectorAdapters = opts.inspectorAdapters;
    this.toExpressionAst = opts.toExpressionAst;
    this.getInfoMessage = opts.getInfoMessage;

    this.schemas = new Schemas(this.editorConfig?.schemas ?? []);
  }
}
