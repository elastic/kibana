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
import type { EuiCallOutProps } from '@elastic/eui';
import { EuiCallOut } from '@elastic/eui';

export interface DeleteManagedAssetsCalloutProps extends EuiCallOutProps {
  assetName: string;
  overrideBody?: string;
}

export const DeleteManagedAssetsCallout = ({
  assetName,
  overrideBody,
  ...overrideCalloutProps
}: DeleteManagedAssetsCalloutProps) => {
  return (
    <EuiCallOut
      color="warning"
      iconType="warning"
      data-test-subj="deleteManagedAssetsCallout"
      {...overrideCalloutProps}
    >
      <p>
        {overrideBody ??
          i18n.translate('management.deleteManagedAssetsCallout.body', {
            defaultMessage: `Elasticsearch automatically re-creates any missing managed {assetName}. If you delete managed {assetName}, the deletion appears as successful, but the {assetName} are immediately re-created and reappear.`,
            values: { assetName },
          })}
      </p>
    </EuiCallOut>
  );
};
