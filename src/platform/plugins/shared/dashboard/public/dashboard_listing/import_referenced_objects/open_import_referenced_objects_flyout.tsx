/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { openLazyFlyout } from '@kbn/presentation-util';
import type { ImportReferencedObjectsResponse } from '@kbn/saved-objects-management-plugin/common';
import { DASHBOARD_API_PATH, DASHBOARD_API_VERSION } from '../../../common/constants';
import { coreServices } from '../../services/kibana_services';

export const openImportReferencedObjectsFlyout = ({
  onImportComplete,
  returnFocus,
}: {
  onImportComplete: () => void;
  returnFocus?: () => void;
}) => {
  openLazyFlyout({
    core: coreServices,
    returnFocus,
    loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
      const { ImportReferencedObjectsFlyout } = await import('./import_referenced_objects_flyout');
      return (
        <ImportReferencedObjectsFlyout
          titleId={ariaLabelledBy}
          closeFlyout={closeFlyout}
          onImportComplete={onImportComplete}
          importObjects={(body) =>
            coreServices.http.post<ImportReferencedObjectsResponse>(
              `${DASHBOARD_API_PATH}/_import`,
              { version: DASHBOARD_API_VERSION, body: JSON.stringify(body) }
            )
          }
        />
      );
    },
    flyoutProps: {
      'data-test-subj': 'importReferencedObjectsFlyout',
      type: 'overlay',
    },
  });
};
