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
import React from 'react';
import { EuiTabbedContent } from '@elastic/eui';
import { getServices } from '../../../kibana_services';
import { DocViewerTab } from './doc_viewer_tab';
import { DocView, DocViewRenderProps } from '../../doc_views/doc_views_types';

/**
 * Rendering tabs with different views of 1 Elasticsearch hit in Discover.
 * The tabs are provided by the `docs_views` registry.
 * A view can contain a React `component`, or any JS framework by using
 * a `render` function.
 */
export function DocViewer(renderProps: DocViewRenderProps) {
  const { docViewsRegistry } = getServices();
  const tabs = docViewsRegistry
    .getDocViewsSorted(renderProps.hit)
    .map(({ title, render, component }: DocView, idx: number) => {
      return {
        id: title,
        name: title,
        content: (
          <DocViewerTab
            id={idx}
            title={title}
            component={component}
            renderProps={renderProps}
            render={render}
          />
        ),
      };
    });

  if (!tabs.length) {
    // There there's a minimum of 2 tabs active in Discover.
    // This condition takes care of unit tests with 0 tabs.
    return null;
  }

  return (
    <div className="kbnDocViewer">
      <EuiTabbedContent tabs={tabs} />
    </div>
  );
}
