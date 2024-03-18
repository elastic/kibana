/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiFlyoutProps, IconType } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { type ComponentType, MouseEventHandler } from 'react';

export interface FlyoutDefaultActionItem {
  disabled?: boolean;
}

export interface FlyoutDefaultActions {
  viewSingleDocument?: FlyoutDefaultActionItem;
  viewSurroundingDocument?: FlyoutDefaultActionItem;
}

export interface FlyoutActionItem {
  id: string;
  enabled: boolean;
  label: string;
  helpText?: string;
  iconType: IconType;
  onClick: (() => void) | MouseEventHandler;
  href?: string;
  dataTestSubj?: string;
}

export interface FlyoutContentProps {
  actions: Pick<DocViewRenderProps, 'filter' | 'onAddColumn' | 'onRemoveColumn'>;
  doc: DataTableRecord;
  renderDefaultContent: () => React.ReactNode;
}

export interface FlyoutCustomization {
  id: 'flyout';
  size?: EuiFlyoutProps['size'];
  title?: string;
  actions: {
    defaultActions?: FlyoutDefaultActions;
    getActionItems?: () => FlyoutActionItem[];
  };
  Content?: ComponentType<FlyoutContentProps>;
  docViewsRegistry?: DocViewRenderProps['docViewsRegistry'];
}
