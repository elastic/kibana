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
import { convertDirectiveToRenderFn } from './doc_views_helpers';
import { DocView, DocViewInput, ElasticSearchHit, DocViewInputFn } from './doc_views_types';

export { DocViewRenderProps, DocView, DocViewRenderFn } from './doc_views_types';

export interface DocViewsRegistry {
  docViews: DocView[];
  addDocView: (docView: DocViewInput) => void;
  getDocViewsSorted: (hit: ElasticSearchHit) => DocView[];
}

export const docViews: DocView[] = [];

/**
 * Extends and adds the given doc view to the registry array
 */
export function addDocView(docView: DocViewInput) {
  if (docView.directive) {
    // convert angular directive to render function for backwards compatibility
    docView.render = convertDirectiveToRenderFn(docView.directive);
  }
  if (typeof docView.shouldShow !== 'function') {
    docView.shouldShow = () => true;
  }
  docViews.push(docView as DocView);
}

/**
 * Empty array of doc views for testing
 */
export function emptyDocViews() {
  docViews.length = 0;
}

/**
 * Returns a sorted array of doc_views for rendering tabs
 */
export function getDocViewsSorted(hit: ElasticSearchHit): DocView[] {
  return docViews
    .filter(docView => docView.shouldShow(hit))
    .sort((a, b) => (Number(a.order) > Number(b.order) ? 1 : -1));
}
/**
 * Provider for compatibility with 3rd Party plugins
 */
export const DocViewsRegistryProvider = {
  register: (docViewRaw: DocViewInput | DocViewInputFn) => {
    const docView = typeof docViewRaw === 'function' ? docViewRaw() : docViewRaw;
    addDocView(docView);
  },
};
