/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlyoutBody, EuiFlyoutFooter } from '@elastic/eui';
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
          <EuiFlyoutBody scrollableTabIndex={-1} data-test-subj={dataTestSubj}>
            {children}
          </EuiFlyoutBody>
          {footerChildren && <EuiFlyoutFooter>{footerChildren}</EuiFlyoutFooter>}
        </>
      )}
    </>
  );
};
