/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { DocViewerTab } from './doc_viewer_tab';
import type { DocView, DocViewRenderProps } from '../../types';

export interface DocViewerProps extends DocViewRenderProps {
  docViews: DocView[];
}

export function getDocViewerTabs({ docViews, ...renderProps }: DocViewerProps) {
  const tabs = docViews
    .filter(({ enabled }) => enabled) // Filter out disabled doc views
    .map(({ id, title, render, component }: DocView) => {
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

  return tabs;
}
