/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { defaultsDeep } from 'lodash';

import { VisParams } from '../types';
import { VisType, VisTypeOptions, VisGroups } from './types';
import { Schemas } from './schemas';

interface CommonBaseVisTypeOptions<TVisParams>
  extends Pick<
      VisType<TVisParams>,
      | 'description'
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
      | 'getUsedIndexPattern'
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
  public readonly editorConfig;
  public hidden;
  public readonly requestHandler;
  public readonly responseHandler;
  public readonly hierarchicalData;
  public readonly setup;
  public readonly getUsedIndexPattern;
  public readonly useCustomNoDataScreen;
  public readonly inspectorAdapters;
  public readonly toExpressionAst;
  public readonly getInfoMessage;
  public readonly schemas;

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
    this.getUsedIndexPattern = opts.getUsedIndexPattern;
    this.useCustomNoDataScreen = opts.useCustomNoDataScreen ?? false;
    this.inspectorAdapters = opts.inspectorAdapters;
    this.toExpressionAst = opts.toExpressionAst;
    this.getInfoMessage = opts.getInfoMessage;

    this.schemas = new Schemas(this.editorConfig?.schemas ?? []);
  }

  public get requiresSearch(): boolean {
    return this.requestHandler !== 'none';
  }
}
