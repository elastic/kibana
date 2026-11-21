/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverServices } from '../../../build_services';
import type { DiscoverCustomizationContext } from '../../../customizations';

/** Whether Discover shows tabs: only standalone and outside the by-value embeddable editor. */
export const getTabsEnabled = (
  { embeddableEditor }: Pick<DiscoverServices, 'embeddableEditor'>,
  { displayMode }: Pick<DiscoverCustomizationContext, 'displayMode'>
): boolean => !embeddableEditor.isByValueEditor() && displayMode === 'standalone';
