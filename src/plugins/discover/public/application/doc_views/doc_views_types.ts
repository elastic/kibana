/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ComponentType } from 'react';
import { IScope } from 'angular';
import { SearchResponse } from 'elasticsearch';
import { IndexPattern } from '../../../../data/public';

export interface AngularDirective {
  controller: (...injectedServices: any[]) => void;
  template: string;
}

export type AngularScope = IScope;

export type ElasticSearchHit<T = unknown> = SearchResponse<T>['hits']['hits'][number];

export interface FieldMapping {
  filterable?: boolean;
  scripted?: boolean;
  rowCount?: number;
  type: string;
  name: string;
  displayName?: string;
}

export type DocViewFilterFn = (
  mapping: FieldMapping | string | undefined,
  value: unknown,
  mode: '+' | '-'
) => void;

export interface DocViewRenderProps {
  columns?: string[];
  filter?: DocViewFilterFn;
  hit: ElasticSearchHit;
  indexPattern?: IndexPattern;
  onAddColumn?: (columnName: string) => void;
  onRemoveColumn?: (columnName: string) => void;
}
export type DocViewerComponent = ComponentType<DocViewRenderProps>;
export type DocViewRenderFn = (
  domeNode: HTMLDivElement,
  renderProps: DocViewRenderProps
) => () => void;

export interface DocViewInput {
  component?: DocViewerComponent;
  directive?: AngularDirective;
  order: number;
  render?: DocViewRenderFn;
  shouldShow?: (hit: ElasticSearchHit) => boolean;
  title: string;
}

export interface DocView extends DocViewInput {
  shouldShow: (hit: ElasticSearchHit) => boolean;
}

export type DocViewInputFn = () => DocViewInput;
