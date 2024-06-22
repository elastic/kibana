/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy, Suspense, useMemo, useState } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/common';
import { useKibana } from '../shared_imports';

import { DataViewEditorProps, DataViewEditorContext } from '../types';

const DataViewFlyoutContentContainer = lazy(() => import('./data_view_flyout_content_container'));

export const DataViewEditorLazy = (props: DataViewEditorProps) => {
  const {
    services: { dataViews },
  } = useKibana<DataViewEditorContext>();

  const [editDataAsDataView, setEditDataAsDataView] = useState<DataView | undefined>();

  useMemo(() => {
    if (props.editData) {
      if (props.editData instanceof DataView) {
        setEditDataAsDataView(props.editData);
      } else {
        dataViews.toDataView(props.editData).then((dv) => {
          setEditDataAsDataView(dv);
        });
      }
    }
  }, [dataViews, props.editData]);

  if (props.editData && !editDataAsDataView) {
    return <EuiLoadingSpinner size="xl" />;
  } else {
    return (
      <Suspense fallback={<EuiLoadingSpinner size="xl" />}>
        <DataViewFlyoutContentContainer {...props} editData={editDataAsDataView} />
      </Suspense>
    );
  }
};
