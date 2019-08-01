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
import { IndexPattern } from 'src/legacy/core_plugins/data/public';

export interface AngularDirective {
  controller: (scope: AngularScope) => void;
  template: string;
}

export interface AngularScope {
  $new: () => AngularScope;
  $digest: () => void;
  $destroy: () => void;
}

export type ElasticSearchHit = Record<string, string | number | Record<string, unknown>>;

export interface DocViewRenderProps {
  columns: string[];
  filter: (field: string, value: string | number, operation: string) => void;
  hit: ElasticSearchHit;
  indexPattern: IndexPattern;
  onAddColumn: (columnName: string) => void;
  onRemoveColumn: (columnName: string) => void;
}
export type DocViewRenderFn = (domeNode: unknown, renderProps: DocViewRenderProps) => () => void;

export interface DocViewInput {
  component?: unknown;
  directive?: AngularDirective;
  order: number;
  render?: DocViewRenderFn;
  shouldShow?: (hit: ElasticSearchHit) => boolean;
  title: string;
}

export interface DocView extends DocViewInput {
  shouldShow: (hit: ElasticSearchHit) => boolean;
}

type DocViewInputFn = () => DocViewInput;

export const docViews: DocView[] = [];

export function addDocView(docViewRaw: DocViewInput) {
  const docView = docViewRaw;
  if (typeof docView.shouldShow !== 'function') {
    docView.shouldShow = () => true;
  }
  docViews.push(docView as DocView);
}

export function getDocViewsSorted(hit: ElasticSearchHit): DocView[] {
  return docViews.filter(docView => docView.shouldShow(hit)).sort(docView => Number(docView.order));
}
/**
 * for compatiblity with 3rd Party plugins
 */
export const DocViewsRegistryProvider = {
  register: (docViewRaw: DocViewInput | DocViewInputFn) => {
    const docView = typeof docViewRaw === 'function' ? docViewRaw() : docViewRaw;
    addDocView(docView);
  },
};
