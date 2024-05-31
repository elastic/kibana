/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { type FC } from 'react';
import {
  Navigation,
  NavigationKibanaProvider,
  type NavigationProps,
  type NavigationKibanaDependencies,
} from '@kbn/shared-ux-chrome-navigation';

export interface Props {
  navProps: NavigationProps;
  deps: NavigationKibanaDependencies;
}

export const SideNavigation: FC<Props> = ({ navProps, deps }) => {
  return (
    <NavigationKibanaProvider {...deps}>
      <Navigation {...navProps} />
    </NavigationKibanaProvider>
  );
};

// We need to use the default export here because of the way React.lazy works
// eslint-disable-next-line import/no-default-export
export default SideNavigation;
