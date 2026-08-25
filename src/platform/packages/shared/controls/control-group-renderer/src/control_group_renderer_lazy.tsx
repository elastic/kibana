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
import type { ControlGroupRendererProps } from './control_group_renderer';

const Component = dynamic(async () => {
  const { ControlGroupRenderer } = await import('./control_group_renderer');
  return {
    default: ControlGroupRenderer,
  };
});

export function LazyControlGroupRenderer(props: ControlGroupRendererProps) {
  return <Component {...props} />;
}
