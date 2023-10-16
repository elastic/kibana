/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiCollapsibleNavBeta } from '@elastic/eui';
import React, { FC } from 'react';

interface Props {
  unstyled?: boolean;
  footerChildren?: React.ReactNode;
  dataTestSubj?: string;
}

export const NavigationUI: FC<Props> = ({ children, unstyled, footerChildren, dataTestSubj }) => {
  return (
    <>
      {unstyled ? (
        <>{children}</>
      ) : (
        <>
          <EuiCollapsibleNavBeta.Body data-test-subj={dataTestSubj}>
            {children}
          </EuiCollapsibleNavBeta.Body>
          {footerChildren && (
            <EuiCollapsibleNavBeta.Footer>{footerChildren}</EuiCollapsibleNavBeta.Footer>
          )}
        </>
      )}
    </>
  );
};
