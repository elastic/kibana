/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';

import useMount from 'react-use/lib/useMount';
import { DataView, DataViewListItem } from '@kbn/data-views-plugin/common';
import { DataViewPicker } from './data_view_picker';
import { injectStorybookDataView } from '../../services/storybook/data_views';
import { storybookFlightsDataView } from '../../mocks';
import { pluginServices, registry, StorybookParams } from '../../services/storybook';

export default {
  component: DataViewPicker,
  title: 'Data View Picker',
  argTypes: {},
};

injectStorybookDataView(storybookFlightsDataView);

export function Example({}: {} & StorybookParams) {
  pluginServices.setRegistry(registry.start({}));

  const {
    dataViews: { getIdsWithTitle, get },
  } = pluginServices.getServices();

  const [dataViews, setDataViews] = useState<DataViewListItem[]>();
  const [dataView, setDataView] = useState<DataView | undefined>(undefined);

  useMount(() => {
    (async () => {
      const listItems = await getIdsWithTitle();
      setDataViews(listItems);
    })();
  });

  const onChange = (newId: string) => {
    get(newId).then((newDataView) => {
      setDataView(newDataView);
    });
  };

  const triggerLabel = dataView?.title || 'Choose Data View';

  return (
    <DataViewPicker
      trigger={{ label: triggerLabel, title: triggerLabel }}
      dataViews={dataViews ?? []}
      selectedDataViewId={dataView?.id}
      onChangeDataViewId={onChange}
    />
  );
}
