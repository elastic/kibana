/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiCollapsibleNavBeta } from '@elastic/eui';

export const ProjectNavigation: React.FC = ({ children }) => {
  return (
    <>
      {
        /* must render the tree to initialize the navigation, even if hidden internally in EUI */
        <div hidden>{children}</div>
      }
      <EuiCollapsibleNavBeta>{children}</EuiCollapsibleNavBeta>
    </>
  );
};
