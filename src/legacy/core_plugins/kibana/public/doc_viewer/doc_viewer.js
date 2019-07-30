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
import { DocViewRenderTab } from './doc_viewer_render_tab';
import { DocViewerAngularTab } from './doc_viewer_angular_tab';

export function DocViewer({ docViews, renderProps }) {
  const tabs = docViews.map(({ title, render, directive, component }) => {
    let content;
    if (component) {
      const Component = component;
      content = <Component {...renderProps} />;
    } else if (render) {
      content = <DocViewRenderTab render={render} renderProps={renderProps} />;
    } else {
      content = <DocViewerAngularTab renderProps={renderProps} directive={directive} />;
    }

    return {
      id: title,
      name: title,
      content,
    };
  });

  return (
    <div className="kbnDocViewer">
      <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} autoFocus="selected" />
    </div>
  );
}
