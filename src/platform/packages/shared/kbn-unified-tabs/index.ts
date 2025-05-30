/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { TabItem, TabPreviewData } from './src/types';
export { TabStatus } from './src/types';
export {
  TabbedContent as UnifiedTabs,
  type TabbedContentProps as UnifiedTabsProps,
} from './src/components/tabbed_content';
export { useNewTabProps } from './src/hooks/use_new_tab_props';
