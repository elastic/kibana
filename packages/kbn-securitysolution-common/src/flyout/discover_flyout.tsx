/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ExpandableFlyout, type ExpandableFlyoutProps } from '@kbn/expandable-flyout';
import { useEuiTheme } from '@elastic/eui';

export interface DiscoverFlyoutProps {
  panels: ExpandableFlyoutProps['registeredPanels'];
}

export const DiscoverFlyout = ({ panels }: DiscoverFlyoutProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <ExpandableFlyout
      registeredPanels={panels}
      paddingSize="none"
      customStyles={{ 'z-index': (euiTheme.levels.flyout as number) + 2 }}
    />
  );
};
