/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonProps, EuiBetaBadgeProps } from '@elastic/eui';
import { InjectedIntl } from '@kbn/i18n-react';

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
  fill?: boolean;
  color?: string;
  isLoading?: boolean;
  iconType?: string;
  iconSide?: EuiButtonProps['iconSide'];
  target?: string;
  href?: string;
  intl?: InjectedIntl;
}

export interface RegisteredTopNavMenuData extends TopNavMenuData {
  appName?: string;
}
