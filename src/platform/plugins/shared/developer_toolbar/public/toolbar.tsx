/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useLayoutUpdate } from '@kbn/core-chrome-layout';
import React, { useCallback } from 'react';
import type { DeveloperToolbarProps } from '@kbn/developer-toolbar';
import { DeveloperToolbar } from '@kbn/developer-toolbar';

export const Toolbar = ({ envInfo }: { envInfo: DeveloperToolbarProps['envInfo'] }) => {
  const updateLayout = useLayoutUpdate();

  const onHeightChange = useCallback(
    (height: number) => {
      updateLayout({
        footerHeight: height,
      });
    },
    [updateLayout]
  );

  return <DeveloperToolbar envInfo={envInfo} onHeightChange={onHeightChange} />;
};

// eslint-disable-next-line import/no-default-export
export default Toolbar;
