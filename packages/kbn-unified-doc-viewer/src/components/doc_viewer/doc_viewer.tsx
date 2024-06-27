/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiTabbedContent } from '@elastic/eui';
import { DocViewerProps, getDocViewerTabs } from './get_doc_viewer_tabs';

/**
 * Rendering tabs with different views of 1 Elasticsearch hit in Discover.
 * The tabs are provided by the `docs_views` registry.
 * A view can contain a React `component`, or any JS framework by using
 * a `render` function.
 */
export function DocViewer({ docViews, ...renderProps }: DocViewerProps) {
  const tabs = getDocViewerTabs({ docViews, ...renderProps });

  return (
    <div className="kbnDocViewer" data-test-subj="kbnDocViewer">
      <EuiTabbedContent size="s" tabs={tabs} />
    </div>
  );
}
