/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import { PanelLoader } from '@kbn/panel-loader';
import type { PresentationPanelErrorProps } from './presentation_panel_error_internal';

const Component = dynamic(
  async () => {
    const { PresentationPanelErrorInternal } = await import('./panel_module');
    return {
      default: PresentationPanelErrorInternal,
    };
  },
  { fallback: <PanelLoader /> }
);

export function PresentationPanelError(props: PresentationPanelErrorProps) {
  return <Component {...props} />;
}
