/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { FC, lazy, Suspense } from 'react';
import { PanelSpinner } from './panel_spinner';
import type { ReportingModalProps } from './image_export_modal';

const LazyModalComponent = lazy(() =>
  import('./image_export_modal').then(({ ReportingModalContent }) => ({
    default: ReportingModalContent,
  }))
);

export const ReportingModalContent: FC<ReportingModalProps> = (props) => {
  return (
    <Suspense fallback={<PanelSpinner />}>
      <LazyModalComponent {...props} />
    </Suspense>
  );
};
