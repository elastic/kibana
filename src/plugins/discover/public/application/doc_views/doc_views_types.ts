/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ComponentType } from 'react';
import { IScope } from 'angular';
import type { estypes } from '@elastic/elasticsearch';
import { IndexPattern } from '../../../../data/public';

export interface AngularDirective {
  controller: (...injectedServices: unknown[]) => void;
  template: string;
}

export type AngularScope = IScope;

export type ElasticSearchHit<T = unknown> = estypes.SearchResponse<T>['hits']['hits'][number];

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

export interface BaseDocViewInput {
  order: number;
  shouldShow?: (hit: ElasticSearchHit) => boolean;
  title: string;
}

export interface RenderDocViewInput extends BaseDocViewInput {
  render: DocViewRenderFn;
  component?: undefined;
  directive?: undefined;
}

interface ComponentDocViewInput extends BaseDocViewInput {
  component: DocViewerComponent;
  render?: undefined;
  directive?: undefined;
}

interface DirectiveDocViewInput extends BaseDocViewInput {
  component?: undefined;
  render?: undefined;
  directive: ng.IDirective;
}

export type DocViewInput = ComponentDocViewInput | RenderDocViewInput | DirectiveDocViewInput;

export type DocView = DocViewInput & {
  shouldShow: NonNullable<DocViewInput['shouldShow']>;
};

export type DocViewInputFn = () => DocViewInput;
