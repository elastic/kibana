/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { type FC } from 'react';
import type { InjectedIntl } from '@kbn/i18n-react';
import type { useShareTypeContext } from '../context';
import { type IShareContext } from '../context';
import type { ExportShareConfig, ShareContext } from '../../types';
export declare const ExportMenu: FC<{
  shareContext: IShareContext;
}>;
export interface ManagedExportFlyoutProps {
  exportIntegration: ExportShareConfig;
  intl: InjectedIntl;
  isDirty: boolean;
  onCloseFlyout: () => void;
  publicAPIEnabled?: boolean;
  shareObjectType: string;
  shareObjectTypeAlias?: string;
  shareObjectTypeMeta: ReturnType<
    typeof useShareTypeContext<'integration', 'export'>
  >['objectTypeMeta'];
  onSave?: () => Promise<void>;
  isSaving?: boolean;
  sharingData: {
    [key: string]: unknown;
  };
  shareableUrlLocatorParams?: ShareContext['shareableUrlLocatorParams'];
}
export declare function ManagedExportFlyout({
  exportIntegration,
  intl,
  isDirty,
  onCloseFlyout,
  publicAPIEnabled,
  shareObjectTypeMeta,
  shareObjectType,
  shareObjectTypeAlias,
  onSave,
  isSaving,
  sharingData,
}: ManagedExportFlyoutProps): React.JSX.Element;
