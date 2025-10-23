/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface FlyoutDescriptionItem {
  title: string;
  description: string | number;
}

/**
 * Creates description list items for main flyout content
 */
export const createMainFlyoutDescriptionItems = (
  flyoutType: string,
  mainSize: string,
  mainMaxWidth?: number,
  renderingMethod?: string
): FlyoutDescriptionItem[] => [
  { title: 'Flyout type', description: flyoutType },
  { title: 'Main flyout size', description: mainSize },
  { title: 'Main flyout maxWidth', description: mainMaxWidth ?? 'N/A' },
  ...(renderingMethod ? [{ title: 'Rendering method', description: renderingMethod }] : []),
];

/**
 * Creates description list items for child flyout content
 */
export const createChildFlyoutDescriptionItems = (
  childSize?: string,
  childMaxWidth?: number,
  renderingMethod?: string
): FlyoutDescriptionItem[] => [
  { title: 'Child flyout size', description: childSize ?? 'N/A' },
  { title: 'Child flyout maxWidth', description: childMaxWidth ?? 'N/A' },
  ...(renderingMethod ? [{ title: 'Rendering method', description: renderingMethod }] : []),
];
