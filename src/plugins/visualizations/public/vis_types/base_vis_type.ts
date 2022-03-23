/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { defaultsDeep } from 'lodash';

import type { VisParams } from '../types';
import type { VisTypeDefinition, VisTypeOptions } from './types';
import { VisGroups } from './vis_groups_enum';
import { Schemas } from './schemas';

const defaultOptions: VisTypeOptions = {
  showTimePicker: true,
  showQueryBar: true,
  showFilterBar: true,
  showIndexSelection: true,
  showQueryInput: true,
  hierarchicalData: false, // we should get rid of this i guess ?
};

export class BaseVisType<TVisParams = VisParams> {
  public readonly name;
  public readonly title;
  public readonly description;
  public readonly note;
  public readonly getSupportedTriggers;
  public readonly navigateToLens;
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
  public readonly updateVisTypeOnParamsChange;
  public readonly schemas;

  constructor(opts: VisTypeDefinition<TVisParams>) {
    if (!opts.icon && !opts.image) {
      throw new Error('vis_type must define its icon or image');
    }

    this.name = opts.name;
    this.description = opts.description ?? '';
    this.note = opts.note ?? '';
    this.getSupportedTriggers = opts.getSupportedTriggers;
    this.navigateToLens = opts.navigateToLens;
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
    this.updateVisTypeOnParamsChange = opts.updateVisTypeOnParamsChange;

    this.schemas = new Schemas(this.editorConfig?.schemas ?? []);
  }
}
