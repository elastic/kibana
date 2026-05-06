/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { ApplicationStart, HttpStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { SavedObjectManagementTypeInfo } from '../types';
import { getAllowedTypes } from '../lib';
import { Flyout } from './objects_table/components';

export interface ManagementLandingSavedObjectsImportFlyoutProps {
  onClose: () => void;
  http: HttpStart;
  search: DataPublicPluginStart['search'];
  dataViews: DataViewsContract;
  applications: ApplicationStart;
}

export function ManagementLandingSavedObjectsImportFlyout({
  onClose,
  http,
  search,
  dataViews,
  applications,
}: ManagementLandingSavedObjectsImportFlyoutProps) {
  const [allowedTypes, setAllowedTypes] = useState<SavedObjectManagementTypeInfo[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAllowedTypes(http).then((types: SavedObjectManagementTypeInfo[]) => {
      if (!cancelled) {
        setAllowedTypes(types);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [http]);

  if (!allowedTypes) {
    return <EuiLoadingSpinner size="xl" />;
  }

  const newIndexPatternUrl = applications.getUrlForApp('management', {
    path: 'kibana/indexPatterns',
  });

  return (
    <Flyout
      close={onClose}
      done={onClose}
      http={http}
      dataViews={dataViews}
      newIndexPatternUrl={newIndexPatternUrl}
      basePath={http.basePath}
      search={search}
      allowedTypes={allowedTypes}
      showPlainSpinner={false}
    />
  );
}
