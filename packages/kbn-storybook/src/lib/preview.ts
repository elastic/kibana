/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProjectAnnotations } from '@storybook/types';
import type { ReactRenderer } from '@storybook/react';
import * as jest from 'jest-mock';

import { decorators } from './decorators';

const preview: ProjectAnnotations<ReactRenderer> = {
  decorators,
  initialGlobals: { euiTheme: 'v8.light' },
};

// eslint-disable-next-line import/no-default-export
export default preview;

/* @ts-expect-error TS doesn't see jest as a property of window, and I don't want to edit our global config. */
window.jest = jest;
