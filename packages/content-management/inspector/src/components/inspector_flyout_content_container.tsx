/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import type { FC } from 'react';

import { InspectorFlyoutContent } from './inspector_flyout_content';

export interface Props {
  todo?: boolean;
}

export const InspectorFlyoutContentContainer: FC<Props> = () => {
  return <InspectorFlyoutContent />;
};
