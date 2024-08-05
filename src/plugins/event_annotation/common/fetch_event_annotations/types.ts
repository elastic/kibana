/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import {
  AggsStart,
  DataViewsContract,
  ExpressionValueSearchContext,
  ISearchStartSearchSource,
} from '@kbn/data-plugin/common';
import { ExpressionFunctionDefinition, Datatable } from '@kbn/expressions-plugin/common';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { EventAnnotationGroupOutput } from '../event_annotation_group';

export type FetchEventAnnotationsOutput = Observable<
  Datatable | { rows: never[]; columns: never[]; type: string }
>;

export interface FetchEventAnnotationsArgs {
  groups: EventAnnotationGroupOutput[];
  interval: string;
}

export type FetchEventAnnotationsExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'fetch_event_annotations',
  ExpressionValueSearchContext | null,
  FetchEventAnnotationsArgs,
  FetchEventAnnotationsOutput
>;

/** @internal */
export interface FetchEventAnnotationsStartDependencies {
  aggs: AggsStart;
  dataViews: DataViewsContract;
  searchSource: ISearchStartSearchSource;
  getNow?: () => Date;
  uiSettings: IUiSettingsClient;
}
