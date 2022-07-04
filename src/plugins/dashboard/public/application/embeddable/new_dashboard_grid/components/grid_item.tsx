/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiPanel } from '@elastic/eui';
import React, { FC } from 'react';
import { GridStackWidget } from '../lib/gridstack_helpers';

interface Props {
  panel: GridStackWidget;
}

export const GridItem: FC<Props> = ({ panel, children }) => {
  const content = panel.render ? panel.render() : panel.content;

  return (
    <EuiPanel
      key={panel.id}
      id={panel.id as string}
      className="grid-stack-item-content embPanel"
      hasShadow
      hasBorder
      paddingSize="m"
    >
      <span data-test-subj="dashboardPanelTitle__wrapper">
        <figcaption className="embPanel__header" data-test-subj="embeddablePanelHeading-">
          <h2 data-test-subj="dashboardPanelTitle" className="embPanel__title embPanel__dragger">
            <span className="embPanel__titleInner">
              <button
                className="euiLink embPanel__titleText embPanel__placeholderTitleText css-qzrsgm-euiLink-text"
                type="button"
                data-test-subj="embeddablePanelTitleLink"
                aria-label="Click to edit title: [No Title]"
              >
                {panel.id}
              </button>
            </span>
          </h2>
        </figcaption>
      </span>
      {children}
    </EuiPanel>
  );
};
