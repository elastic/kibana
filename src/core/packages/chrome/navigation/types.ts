/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IconType } from '@elastic/eui';

export interface ISecondaryMenuItem {
  'data-test-subj'?: string;
  external?: boolean;
  href: string;
  iconType?: IconType;
  id: string;
  label: string;
}

export interface ISecondaryMenuSection {
  id: string;
  items: ISecondaryMenuItem[];
  label: string | null;
}

export interface IMenuItem {
  'data-test-subj'?: string;
  href: string;
  iconType?: IconType;
  id: string;
  label: string;
  sections?: ISecondaryMenuSection[];
}
export interface INavigationStructure {
  footerItems: IMenuItem[];
  primaryItems: IMenuItem[];
}

export interface IMenuCalculations {
  availableHeight: number;
  itemGap: number;
  maxVisibleItems: number;
}
