/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { Markdown } from '@kbn/kibana-react-plugin/public';
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
        openLinksInNewTab={openLinksInNewTab}
        markdown={markdown}
      />
    </div>
  );
};

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { MarkdownVisComponent as default };
