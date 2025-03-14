/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MouseEventHandler } from 'react';
import type { IconType, CommonProps } from '@elastic/eui';

export interface MenuItem extends Pick<CommonProps, 'data-test-subj'> {
  id: string;
  name: string;
  icon: IconType;
  onClick: MouseEventHandler;
  description?: string;
  isDisabled?: boolean;
  isDeprecated?: boolean;
  order: number;
}

export interface MenuItemGroup extends Pick<CommonProps, 'data-test-subj'> {
  id: string;
  isDisabled?: boolean;
  title: string;
  order: number;
  items: MenuItem[];
}
