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
import { injectAngularElement } from './doc_views_helpers';
import {
  DocView,
  DocViewInput,
  ElasticSearchHit,
  DocViewInputFn,
  DocViewRenderProps,
} from './doc_views_types';

export { DocViewRenderProps, DocView, DocViewRenderFn } from './doc_views_types';

export const docViews: DocView[] = [];

export function addDocView(docViewRaw: DocViewInput) {
  const docView = docViewRaw;
  const { directive } = docViewRaw;
  if (directive) {
    // convert angular directive to render function for backwards compatibilty
    docViewRaw.render = (domNode: Element, props: DocViewRenderProps) => {
      const cleanupFnPromise = injectAngularElement(
        domNode,
        directive.template,
        props,
        directive.controller
      );
      return () => {
        // for cleanup
        // http://roubenmeschian.com/rubo/?p=51
        cleanupFnPromise.then(cleanup => cleanup());
      };
    };
  }
  if (typeof docView.shouldShow !== 'function') {
    docView.shouldShow = () => true;
  }
  docViews.push(docView as DocView);
}

export function getDocViewsSorted(hit: ElasticSearchHit): DocView[] {
  return docViews.filter(docView => docView.shouldShow(hit)).sort(docView => Number(docView.order));
}
/**
 * for compatiblity with 3rd Party plugins,
 */
export const DocViewsRegistryProvider = {
  register: (docViewRaw: DocViewInput | DocViewInputFn) => {
    const docView = typeof docViewRaw === 'function' ? docViewRaw() : docViewRaw;
    addDocView(docView);
  },
};
