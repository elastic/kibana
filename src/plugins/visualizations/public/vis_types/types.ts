/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IconType } from '@elastic/eui';
import type { ReactNode } from 'react';
import type { Adapters } from '@kbn/inspector-plugin/common';
import { TimeRange } from '@kbn/data-plugin/common';
import type { AggGroupNames, AggParam, AggGroupName } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Vis, VisEditorOptionsProps, VisParams, VisToExpressionAst } from '../types';
import { VisGroups } from './vis_groups_enum';
import { NavigateToLensContext } from '../../common';

export interface VisTypeOptions {
  showTimePicker: boolean;
  showQueryBar: boolean;
  showFilterBar: boolean;
  showIndexSelection: boolean;
  showQueryInput: boolean;
  hierarchicalData: boolean;
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
  enableDataViewChange?: boolean;
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
  readonly getSupportedTriggers?: (params?: VisParams) => string[];
  /**
   * If given, it will navigateToLens with the given viz params.
   * Every visualization that wants to be edited also in Lens should have this function.
   * It receives the current visualization params as a parameter and should return the correct config
   * in order to be displayed in the Lens editor.
   */
  readonly navigateToLens?: (
    params?: VisParams,
    timeRange?: TimeRange
  ) => Promise<NavigateToLensContext | null> | undefined;

  /**
   * Some visualizations are created without SearchSource and may change the used indexes during the visualization configuration.
   * Using this method we can rewrite the standard mechanism for getting used indexes
   */
  readonly getUsedIndexPattern?: (visParams: VisParams) => DataView[] | Promise<DataView[]>;

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
   * It sets the vis type on a deprecated mode when is true
   */
  readonly isDeprecated?: boolean;
  /**
   * If returns true, no warning toasts will be shown
   */
  readonly suppressWarnings?: () => boolean;
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
  /**
   * In case when the visualization performs an aggregation, this option will be used to display or hide the rows with partial data.
   */
  readonly hasPartialRows?: boolean | ((vis: { params: TVisParams }) => boolean);
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
   * When truthy, it will perform a search and pass the results to the visualization as a `datatable`.
   * @default false
   */
  readonly fetchDatatable?: boolean;
  /**
   * Should be provided to expand base visualization expression with
   * custom exprsesion chain, including render expression.
   * Explicit renderer should be registered in expressions plugin to render your visualization.
   */
  readonly toExpressionAst: VisToExpressionAst<TVisParams>;

  /**
   * Should be defined when the visualization type should change
   * when certain params are changed
   */
  readonly updateVisTypeOnParamsChange?: (params: VisParams) => string | undefined;

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
