/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';

import { DataView, DataViewListItem } from '@kbn/data-views-plugin/common';
import useMount from 'react-use/lib/useMount';
import { DataViewPicker } from './data_view_picker';
import { dataViewsService } from '../../services/kibana_services';

export default {
  component: DataViewPicker,
  title: 'Data View Picker',
  argTypes: {},
};

export function Example() {
  const [dataViews, setDataViews] = useState<DataViewListItem[]>();
  const [dataView, setDataView] = useState<DataView | undefined>(undefined);

  useMount(() => {
    (async () => {
      const listItems = await dataViewsService.getIdsWithTitle();
      setDataViews(listItems);
    })();
  });

  const onChange = (newId: string) => {
    dataViewsService.get(newId).then((newDataView) => {
      setDataView(newDataView);
    });
  };

  const triggerLabel = dataView?.getName() || 'Choose Data View';

  return (
    <DataViewPicker
      trigger={{ label: triggerLabel, title: triggerLabel }}
      dataViews={dataViews ?? []}
      selectedDataViewId={dataView?.id}
      onChangeDataViewId={onChange}
    />
  );
}
