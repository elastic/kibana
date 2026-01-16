/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type { AppMenuExtensionParams } from '../../../../../context_awareness/types';

export type AppMenuDiscoverParams = AppMenuExtensionParams;

/**
 * Discover-specific run action type that includes onFinishAction callback.
 * This extends the base AppMenuRunAction with an optional callback for cleanup.
 */
export type DiscoverAppMenuRunAction = (
  triggerElement: HTMLElement,
  onFinishAction: () => void
) => void | ReactNode | Promise<void | ReactNode>;
