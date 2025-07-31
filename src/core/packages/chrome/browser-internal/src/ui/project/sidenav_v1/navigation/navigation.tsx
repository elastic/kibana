/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC } from 'react';
import {
  Navigation as NavigationComponent,
  NavigationKibanaProvider,
  type NavigationProps,
  type NavigationChromeDependencies,
} from '@kbn/shared-ux-chrome-navigation';

export type Props = NavigationProps & NavigationChromeDependencies;

export const Navigation: FC<Props> = ({ dataTestSubj$, navigationTree$, ...rest }) => {
  return (
    <NavigationKibanaProvider {...rest}>
      <NavigationComponent dataTestSubj$={dataTestSubj$} navigationTree$={navigationTree$} />
    </NavigationKibanaProvider>
  );
};

// We need to use the default export here because of the way React.lazy works
// eslint-disable-next-line import/no-default-export
export default Navigation;
