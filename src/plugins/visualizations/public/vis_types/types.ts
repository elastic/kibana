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
import React from 'react';
import { Adapters } from 'src/plugins/inspector';
import { IndexPattern } from 'src/plugins/data/public';
import { ISchemas } from 'src/plugins/vis_default_editor/public';
import { TriggerContextMapping } from '../../../ui_actions/public';
import { Vis, VisToExpressionAst, VisualizationControllerConstructor } from '../types';

export interface VisTypeOptions {
  showTimePicker: boolean;
  showQueryBar: boolean;
  showFilterBar: boolean;
  showIndexSelection: boolean;
  hierarchicalData: boolean;
}

/**
 * A visualization type representing one specific type of "classical"
 * visualizations (i.e. not Lens visualizations).
 */
export interface VisType<TVisParams = unknown> {
  readonly name: string;
  readonly title: string;
  readonly description?: string;
  readonly getSupportedTriggers?: () => Array<keyof TriggerContextMapping>;
  readonly isAccessible?: boolean;
  readonly requestHandler?: string | unknown;
  readonly responseHandler?: string | unknown;
  readonly icon?: IconType;
  readonly image?: string;
  readonly stage: 'experimental' | 'beta' | 'production';
  readonly requiresSearch: boolean;
  readonly useCustomNoDataScreen: boolean;
  readonly hierarchicalData?: boolean | ((vis: { params: TVisParams }) => boolean);
  readonly inspectorAdapters?: Adapters | (() => Adapters);
  /**
   * When specified this visualization is deprecated. This function
   * should return a ReactElement that will render a deprecation warning.
   * It will be shown in the editor when editing/creating visualizations
   * of this type.
   */
  readonly getInfoMessage?: (vis: Vis) => React.ReactNode;

  readonly toExpressionAst?: VisToExpressionAst<TVisParams>;
  readonly visualization?: VisualizationControllerConstructor;

  /**
   * Some visualizations are created without SearchSource and may change the used indexes during the visualization configuration.
   * Using this method we can rewrite the standard mechanism for getting used indexes
   */
  readonly getUsedIndexPattern?: (
    visParams: TVisParams
  ) => IndexPattern[] | Promise<IndexPattern[]>;

  readonly setup?: (vis: Vis<TVisParams>) => Promise<Vis<TVisParams>>;
  hidden: boolean;

  readonly schemas: ISchemas;

  readonly options: VisTypeOptions;

  // TODO: The following types still need to be refined properly.

  /**
   * The editor that should be used to edit visualizations of this type.
   */
  readonly editor?: any;
  readonly editorConfig: Record<string, any>;
  readonly visConfig: Record<string, any>;
}
