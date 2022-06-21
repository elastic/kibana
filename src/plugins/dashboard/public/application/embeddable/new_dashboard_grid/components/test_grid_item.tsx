/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiPanel } from '@elastic/eui';
import { GridStackWidget } from 'gridstack';
import React from 'react';

interface Props {
  panel: GridStackWidget & { render?: () => JSX.Element };
}

export const TestGridItem = React.forwardRef<HTMLDivElement, Props>(({ panel }, ref) => {
  return (
    <div
      id={panel.id as string}
      gs-w={panel.w}
      gs-h={panel.h}
      gs-x={panel.x}
      gs-y={panel.y}
      ref={ref}
      key={panel.id}
      className={'grid-stack-item'}
    >
      <EuiPanel
        key={panel.id}
        hasShadow
        hasBorder
        className={'grid-stack-item-content'}
        paddingSize="s"
      >
        {panel.render ? panel.render() : panel.content}
      </EuiPanel>
    </div>
  );
});
