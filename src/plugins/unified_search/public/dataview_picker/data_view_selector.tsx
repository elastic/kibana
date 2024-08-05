/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, useEffect, useRef, useState } from 'react';
import type { EuiSelectableProps } from '@elastic/eui';
import type { DataViewListItem, DataViewSpec } from '@kbn/data-views-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DataViewsList } from './dataview_list';
import { IUnifiedSearchPluginServices } from '../types';
import { ExploreMatchingButton } from './explore_matching_button';

export interface DataViewSelectorProps {
  currentDataViewId?: string;
  searchListInputId?: string;
  dataViewsList: DataViewListItem[];
  selectableProps?: EuiSelectableProps;
  setPopoverIsOpen: (isOpen: boolean) => void;
  onChangeDataView: (dataViewId: string) => void;
  onCreateDefaultAdHocDataView?: (dataViewSpec: DataViewSpec) => void;
}

export const DataViewSelector = ({
  currentDataViewId,
  searchListInputId,
  dataViewsList,
  selectableProps,
  setPopoverIsOpen,
  onChangeDataView,
  onCreateDefaultAdHocDataView,
}: DataViewSelectorProps) => {
  const kibana = useKibana<IUnifiedSearchPluginServices>();
  const { dataViews } = kibana.services;

  const [noDataViewMatches, setNoDataViewMatches] = useState(false);
  const [dataViewSearchString, setDataViewSearchString] = useState('');
  const [indexMatches, setIndexMatches] = useState(0);

  const pendingIndexMatch = useRef<undefined | NodeJS.Timeout>();

  useEffect(() => {
    async function checkIndices() {
      if (dataViewSearchString !== '' && noDataViewMatches) {
        const matches = await dataViews.getIndices({
          pattern: dataViewSearchString,
          isRollupIndex: () => false,
          showAllIndices: false,
        });
        setIndexMatches(matches.length);
      }
    }

    pendingIndexMatch.current = setTimeout(checkIndices, 250);
    return () => {
      if (pendingIndexMatch.current) {
        clearTimeout(pendingIndexMatch.current);
      }
    };
  }, [dataViewSearchString, dataViews, noDataViewMatches]);

  return (
    <Fragment>
      <DataViewsList
        dataViewsList={dataViewsList}
        onChangeDataView={onChangeDataView}
        currentDataViewId={currentDataViewId}
        selectableProps={{
          ...(selectableProps || {}),
          // @ts-expect-error Some EUI weirdness
          searchProps: {
            ...(selectableProps?.searchProps || {}),
            onChange: (value, matches) => {
              selectableProps?.searchProps?.onChange?.(value, matches);
              setNoDataViewMatches(matches.length === 0 && dataViewsList.length > 0);
              setDataViewSearchString(value);
            },
          },
        }}
        searchListInputId={searchListInputId}
      />
      <ExploreMatchingButton
        noDataViewMatches={noDataViewMatches}
        indexMatches={indexMatches}
        dataViewSearchString={dataViewSearchString}
        setPopoverIsOpen={setPopoverIsOpen}
        onCreateDefaultAdHocDataView={onCreateDefaultAdHocDataView}
      />
    </Fragment>
  );
};

// React.lazy support
// eslint-disable-next-line import/no-default-export
export default DataViewSelector;
