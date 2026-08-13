/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  KbnInfoCallout,
  KbnSuccessCallout,
  KbnWarningCallout,
  KbnDangerCallout,
  type KbnCalloutProps,
} from '@kbn/ui-callout';

export type DeleteManagedAssetsCalloutColor = 'primary' | 'success' | 'warning' | 'danger';

const COLOR_TO_CALLOUT_MAP = {
  primary: KbnInfoCallout,
  success: KbnSuccessCallout,
  warning: KbnWarningCallout,
  danger: KbnDangerCallout,
} as const;

export interface DeleteManagedAssetsCalloutProps extends Omit<KbnCalloutProps, 'title'> {
  assetName: string;
  overrideBody?: string;
  title?: KbnCalloutProps['title'];
  color?: DeleteManagedAssetsCalloutColor;
}

export const DeleteManagedAssetsCallout = ({
  assetName,
  overrideBody,
  title,
  color = 'warning',
  ...overrideCalloutProps
}: DeleteManagedAssetsCalloutProps) => {
  const defaultTitle = i18n.translate('management.deleteManagedAssetsCallout.title', {
    defaultMessage: 'Managed {assetName} will be re-created',
    values: { assetName },
  });

  const Component = COLOR_TO_CALLOUT_MAP[color];

  return (
    <Component
      data-test-subj="deleteManagedAssetsCallout"
      title={title ?? defaultTitle}
      text={
        <p>
          {overrideBody ??
            i18n.translate('management.deleteManagedAssetsCallout.body', {
              defaultMessage: `Elasticsearch automatically re-creates any missing managed {assetName}. If you delete managed {assetName}, the deletion appears as successful, but the {assetName} are immediately re-created and reappear.`,
              values: { assetName },
            })}
        </p>
      }
      {...overrideCalloutProps}
    />
  );
};
