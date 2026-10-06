/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { EuiEmptyPromptProps } from '@elastic/eui';
interface NotFoundProps {
  /** Array of buttons, links and other actions to show at the bottom of the `EuiEmptyPrompt`. Defaults to a "Back" button. */
  actions?: EuiEmptyPromptProps['actions'];
  title?: EuiEmptyPromptProps['title'] | string;
  body?: EuiEmptyPromptProps['body'];
}
/**
 * Predefined `EuiEmptyPrompt` for 404 pages.
 */
export declare const NotFoundPrompt: ({ actions, title, body }: NotFoundProps) => React.JSX.Element;
export {};
