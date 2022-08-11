/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButtonProps, EuiBetaBadgeProps } from '@elastic/eui';

export type TopNavMenuAction = (anchorElement: HTMLElement) => void;

export interface TopNavMenuData {
  id?: string;
  label: string;
  run: TopNavMenuAction;
  description?: string;
  testId?: string;
  className?: string;
  disableButton?: boolean | (() => boolean);
  tooltip?: string | (() => string | undefined);
  badge?: EuiBetaBadgeProps;
  emphasize?: boolean;
  isLoading?: boolean;
  iconType?: string;
  iconSide?: EuiButtonProps['iconSide'];
  target?: string;
  href?: string;
}

export interface RegisteredTopNavMenuData extends TopNavMenuData {
  appName?: string;
}
