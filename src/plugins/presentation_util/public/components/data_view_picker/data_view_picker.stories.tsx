/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';

import { DataView, DataViewListItem } from '@kbn/data-views-plugin/common';
import useMount from 'react-use/lib/useMount';
import { storybookFlightsDataView } from '../../mocks';
import { injectStorybookDataView } from '../../services/data_views/data_views.story';
import { StorybookParams, pluginServices, registry } from '../../services/plugin_services.story';
import { DataViewPicker } from './data_view_picker';

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
