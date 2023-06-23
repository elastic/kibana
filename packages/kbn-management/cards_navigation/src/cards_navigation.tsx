/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { CardsNavigationComponent as Component } from './cards_navigation.component';

import type { CardsNavigationProps } from './types';

// We need to wrap the component in a redirect app links component so that when the user
// clicks on a link in the card, they are redirected to the correct app without a full page reload
export const CardsNavigation = ({ coreStart, ...props }: CardsNavigationProps) => {
  return (
    <RedirectAppLinks coreStart={coreStart}>
      <Component {...props} />;
    </RedirectAppLinks>
  );
};
