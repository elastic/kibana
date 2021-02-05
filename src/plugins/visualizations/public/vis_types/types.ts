/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IconType } from '@elastic/eui';
import { ReactNode } from 'react';
import { Adapters } from 'src/plugins/inspector';
import { IndexPattern, AggGroupNames, AggParam, AggGroupName } from '../../../data/public';
import { Vis, VisEditorOptionsProps, VisParams, VisToExpressionAst } from '../types';

export interface VisTypeOptions {
  showTimePicker: boolean;
  showQueryBar: boolean;
  showFilterBar: boolean;
  showIndexSelection: boolean;
  hierarchicalData: boolean;
}

export enum VisGroups {
  PROMOTED = 'promoted',
  TOOLS = 'tools',
  AGGBASED = 'aggbased',
}

export interface ISchemas {
  [AggGroupNames.Buckets]: Schema[];
  [AggGroupNames.Metrics]: Schema[];
  all: Schema[];
}

export interface Schema {
  aggFilter: string[];
  group: AggGroupName;
  max: number;
  min: number;
  name: string;
  params: AggParam[];
  title: string;
  defaults: unknown;
  hideCustomLabel?: boolean;
  mustBeFirst?: boolean;
  aggSettings?: any;
  disabled?: boolean;
  tooltip?: ReactNode;
}

type DefaultEditorOptionsComponent<TVisParams> = React.ComponentType<
  VisEditorOptionsProps<TVisParams>
>;

interface DefaultEditorConfig<TVisParams> {
  // collections should moved directly into default editor in https://github.com/elastic/kibana/issues/84879
  collections?: {
    [key: string]: Array<{ text: string; value: string }> | Array<{ id: string; label: string }>;
  };
  enableAutoApply?: boolean;
  defaultSize?: string;
  optionsTemplate?: DefaultEditorOptionsComponent<TVisParams>;
  optionTabs?: Array<{
    name: string;
    title: string;
    editor: DefaultEditorOptionsComponent<TVisParams>;
  }>;
  schemas?: Array<Partial<Schema>>;
}

interface CustomEditorConfig {
  editor: string;
}

/**
 * A visualization type definition representing a spec of one specific type of "classical"
 * visualizations (i.e. not Lens visualizations).
 */
export interface VisTypeDefinition<TVisParams> {
  /**
   * Visualization unique name
   */
  readonly name: string;
  /**
   * It is the displayed text on the wizard and the vis listing
   */
  readonly title: string;
  /**
   * If given, it will be diplayed on the wizard vis card as the main description.
   */
  readonly description?: string;
  /**
   * If given, it will be diplayed on the wizard vis card as a note in italic.
   */
  readonly note?: string;
  /**
   * If given, it will return the supported triggers for this vis.
   */
  readonly getSupportedTriggers?: () => string[];

  /**
   * Some visualizations are created without SearchSource and may change the used indexes during the visualization configuration.
   * Using this method we can rewrite the standard mechanism for getting used indexes
   */
  readonly getUsedIndexPattern?: (visParams: VisParams) => IndexPattern[] | Promise<IndexPattern[]>;

  readonly isAccessible?: boolean;
  /**
   * It is the visualization icon, displayed on the wizard.
   */
  readonly icon?: IconType;
  /**
   * Except from an icon, an image can be passed
   */
  readonly image?: string;
  /**
   * Describes the visualization stage
   * @default 'production'
   */
  readonly stage?: 'experimental' | 'beta' | 'production';
  /**
   * Describes the experience group that the visualization belongs.
   * It can be on tools, aggregation based or promoted group.
   * @default 'aggbased'
   */
  readonly group?: VisGroups;
  /**
   * If given, it will be displayed on the wizard instead of the title.
   * We use it because we want to differentiate the vis title from the
   * way it is presented on the wizard
   */
  readonly titleInWizard?: string;
  /**
   * The flag is necessary for aggregation based visualizations.
   * When "true", an additional step on the vis creation wizard will be provided
   * with the selection of a search source - an index pattern or a saved search.
   */
  readonly requiresSearch?: boolean;
  readonly hierarchicalData?: boolean | ((vis: { params: TVisParams }) => boolean);
  readonly inspectorAdapters?: Adapters | (() => Adapters);
  /**
   * When specified this visualization is deprecated. This function
   * should return a ReactElement that will render a deprecation warning.
   * It will be shown in the editor when editing/creating visualizations
   * of this type.
   */
  readonly getInfoMessage?: (vis: Vis) => React.ReactNode;
  /**
   * Should be provided to expand base visualization expression with
   * custom exprsesion chain, including render expression.
   * Explicit renderer should be registered in expressions plugin to render your visualization.
   */
  readonly toExpressionAst: VisToExpressionAst<TVisParams>;

  readonly setup?: (vis: Vis<TVisParams>) => Promise<Vis<TVisParams>>;
  hidden?: boolean;

  readonly options?: Partial<VisTypeOptions>;

  /**
   * Config for the default editor.
   * Custom editor can be specified.
   */
  readonly editorConfig: DefaultEditorConfig<TVisParams> | CustomEditorConfig;
  /**
   * Have the "defaults" prop with default params for a visualization.
   * TODO: ideally should have next type: { defaults: TVisParams } , but currently
   * have incosistencies in legacy visLib visualizations
   */
  readonly visConfig: Record<string, any>;
}
