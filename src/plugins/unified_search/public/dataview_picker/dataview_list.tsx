/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiSelectable, EuiSelectableProps, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { DataViewListItem } from '../../../data_views/public';

export interface DataViewsListProps {
  dataViewsList: DataViewListItem[];
  onChangeDataView: (newId: string) => void;
  currentDataViewId?: string;
  selectableProps?: EuiSelectableProps;
  searchListInputId?: string;
}

export function DataViewsList({
  dataViewsList,
  onChangeDataView,
  currentDataViewId,
  selectableProps,
  searchListInputId,
}: DataViewsListProps) {
  return (
    <EuiSelectable<{
      key?: string;
      label: string;
      value?: string;
      checked?: 'on' | 'off' | undefined;
    }>
      {...selectableProps}
      data-test-subj="indexPattern-switcher"
      searchable
      singleSelection="always"
      options={dataViewsList?.map(({ title, id }) => ({
        key: id,
        label: title,
        value: id,
        checked: id === currentDataViewId ? 'on' : undefined,
      }))}
      onChange={(choices) => {
        const choice = choices.find(({ checked }) => checked) as unknown as {
          value: string;
        };
        onChangeDataView(choice.value);
      }}
      searchProps={{
        id: searchListInputId,
        compressed: true,
        placeholder: i18n.translate('unifiedSearch.query.queryBar.indexPattern.findDataView', {
          defaultMessage: 'Find a data view',
        }),
        ...(selectableProps ? selectableProps.searchProps : undefined),
      }}
    >
      {(list, search) => (
        <EuiPanel
          css={css`
            padding-bottom: 0;
          `}
          color="transparent"
          paddingSize="s"
        >
          {search}
          {list}
        </EuiPanel>
      )}
    </EuiSelectable>
  );
}
