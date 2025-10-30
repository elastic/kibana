/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';
export type { ProjectPickerProps } from './components/project_picker';

const ProjectPickerLazy = React.lazy(async () => {
  const { ProjectPicker: Component } = await import('./components/project_picker');
  return { default: Component };
});

export const ProjectPicker = withSuspense(ProjectPickerLazy);
