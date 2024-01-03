/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiTabbedContent } from '@elastic/eui';
import { DocViewerTab } from './doc_viewer_tab';
import type { DocView, DocViewRenderProps } from '../../types';

export interface DocViewerProps extends DocViewRenderProps {
  docViews: DocView[];
}

/**
 * Rendering tabs with different views of 1 Elasticsearch hit in Discover.
 * The tabs are provided by the `docs_views` registry.
 * A view can contain a React `component`, or any JS framework by using
 * a `render` function.
 */
export function DocViewer({ docViews, ...renderProps }: DocViewerProps) {
  const tabs = docViews.map(({ id, title, render, component }: DocView) => {
    return {
      id: `kbn_doc_viewer_tab_${id}`,
      name: title,
      content: (
        <DocViewerTab
          id={id}
          title={title}
          component={component}
          renderProps={renderProps}
          render={render}
        />
      ),
      ['data-test-subj']: `docViewerTab-${id}`,
    };
  });

  if (!tabs.length) {
    // There's a minimum of 2 tabs active in Discover.
    // This condition takes care of unit tests with 0 tabs.
    return null;
  }

  return (
    <div className="kbnDocViewer" data-test-subj="kbnDocViewer">
      <EuiTabbedContent size="s" tabs={tabs} />
    </div>
  );
}
