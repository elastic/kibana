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

import React, { useEffect } from 'react';
import { Markdown } from '../../kibana_react/public';
import { MarkdownVisParams } from './types';

import './markdown_vis.scss';

interface MarkdownVisComponentProps extends MarkdownVisParams {
  renderComplete: () => void;
}

const MarkdownVisComponent = ({
  fontSize,
  markdown,
  openLinksInNewTab,
  renderComplete,
}: MarkdownVisComponentProps) => {
  useEffect(renderComplete); // renderComplete will be called after each render to signal, that we are done with rendering.

  return (
    <div className="mkdVis" style={{ fontSize: `${fontSize}pt` }}>
      <Markdown
        data-test-subj="markdownBody"
        markdown={markdown}
        openLinksInNewTab={openLinksInNewTab}
      />
    </div>
  );
};

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { MarkdownVisComponent as default };
