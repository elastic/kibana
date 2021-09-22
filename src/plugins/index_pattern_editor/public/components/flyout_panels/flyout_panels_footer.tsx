/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect } from 'react';
import { EuiFlyoutFooter, EuiFlyoutFooterProps } from '@elastic/eui';

import { useFlyoutPanelContext } from './flyout_panel';

export const PanelFooter: React.FC<
  { children: React.ReactNode } & Omit<EuiFlyoutFooterProps, 'children'>
> = (props) => {
  const { registerFooter } = useFlyoutPanelContext();

  useEffect(() => {
    registerFooter();
  }, [registerFooter]);

  return <EuiFlyoutFooter className="fieldEditor__flyoutPanel__footer" {...props} />;
};
