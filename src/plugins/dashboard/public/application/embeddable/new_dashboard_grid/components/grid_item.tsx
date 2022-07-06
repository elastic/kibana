/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButtonIcon, EuiPanel, EuiText } from '@elastic/eui';
import React, { FC } from 'react';
import { GridStackWidget } from '../lib/gridstack_helpers';

interface Props {
  panel: GridStackWidget;
}

export const GridItem: FC<Props> = ({ panel, children }) => {
  const content = panel.render ? panel.render() : panel.content || `I am panel: ${panel.id}`;

  return (
    <EuiPanel
      key={panel.id}
      id={panel.id as string}
      className="grid-stack-item-content embPanel embPanel--editing"
      paddingSize="none"
      style={{ overflow: 'hidden' }}
    >
      <span data-test-subj="dashboardPanelTitle__wrapper">
        <figcaption className="embPanel__header" style={{ height: '24px' }}>
          <h2 className="embPanel__title embPanel__dragger">
            <span className="embPanel__titleInner">
              <span className="embPanel__titleText">
                {panel.title ?? (
                  <EuiText size="xs" color="subdued">
                    {'[No title]'}
                  </EuiText>
                )}
              </span>
            </span>
          </h2>
          <EuiButtonIcon iconType="gear" />
        </figcaption>
      </span>
      <div style={{ padding: '4px', overflow: 'scroll', width: '100%', height: '100%' }}>
        {content}
      </div>
    </EuiPanel>
  );
};
