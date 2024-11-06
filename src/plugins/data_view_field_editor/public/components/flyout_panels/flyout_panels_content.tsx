/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';

import { useFlyoutPanelContext } from './flyout_panel';

export const PanelContent: React.FC<{ children: React.ReactNode }> = (props) => {
  const { registerContent } = useFlyoutPanelContext();

  useEffect(() => {
    registerContent();
  }, [registerContent]);

  // Adding a tabIndex prop to the div as it is the body of the flyout which is scrollable.
  return (
    <div className="fieldEditor__flyoutPanel__content eui-scrollBar" tabIndex={0} {...props} />
  );
};
