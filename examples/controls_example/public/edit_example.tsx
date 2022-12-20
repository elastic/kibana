/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { EuiPanel } from '@elastic/eui';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { LazyControlGroupRenderer, ControlGroupContainer } from '@kbn/controls-plugin/public';
import { withSuspense } from '@kbn/presentation-util-plugin/public';

const ControlGroupRenderer = withSuspense(LazyControlGroupRenderer);

export const EditExample = () => {
  const [controlGroup, setControlGroup] = useState<ControlGroupContainer>();

  return (
    <EuiPanel hasBorder={true}>
      <ControlGroupRenderer
        getInitialInput={async (initialInput, builder) => {
          return {
            ...initialInput,
            viewMode: ViewMode.EDIT,
          };
        }}
        onLoadComplete={async (newControlGroup) => {
          setControlGroup(newControlGroup);
        }}
      />
    </EuiPanel>
  );
};
