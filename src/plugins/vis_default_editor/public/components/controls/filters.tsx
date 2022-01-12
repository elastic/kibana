/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect } from 'react';
import { omit, isEqual } from 'lodash';
import { htmlIdGenerator, EuiButton, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import useMount from 'react-use/lib/useMount';

import { Query, DataPublicPluginStart } from '../../../../data/public';
import { IUiSettingsClient } from '../../../../../core/public';
import { useKibana } from '../../../../kibana_react/public';
import { FilterRow } from './filter';
import { AggParamEditorProps } from '../agg_param_props';

const generateId = htmlIdGenerator();

interface FilterValue {
  input: Query;
  label: string;
  id: string;
}

function FiltersParamEditor({ agg, value = [], setValue }: AggParamEditorProps<FilterValue[]>) {
  const [filters, setFilters] = useState(() =>
    value.map((filter) => ({ ...filter, id: generateId() }))
  );

  useMount(() => {
    // set parsed values into model after initialization
    setValue(
      filters.map((filter) => omit({ ...filter, input: filter.input }, 'id') as FilterValue)
    );
  });

  useEffect(() => {
    // responsible for discarding changes
    if (
      value.length !== filters.length ||
      value.some((filter, index) => !isEqual(filter, omit(filters[index], 'id')))
    ) {
      setFilters(value.map((filter) => ({ ...filter, id: generateId() })));
    }
  }, [filters, value]);

  const updateFilters = (updatedFilters: FilterValue[]) => {
    // do not set internal id parameter into saved object
    setValue(updatedFilters.map((filter) => omit(filter, 'id') as FilterValue));
    setFilters(updatedFilters);
  };

  const { services } = useKibana<{ uiSettings: IUiSettingsClient; data: DataPublicPluginStart }>();

  const onAddFilter = () =>
    updateFilters([
      ...filters,
      {
        input: services.data.query.queryString.getDefaultQuery(),
        label: '',
        id: generateId(),
      },
    ]);
  const onRemoveFilter = (id: string) =>
    updateFilters(filters.filter((filter) => filter.id !== id));
  const onChangeValue = (id: string, query: Query, label: string) =>
    updateFilters(
      filters.map((filter) =>
        filter.id === id
          ? {
              ...filter,
              input: query,
              label,
            }
          : filter
      )
    );

  return (
    <>
      <EuiSpacer size="m" />
      {filters.map(({ input, label, id }, arrayIndex) => (
        <FilterRow
          key={id}
          id={id}
          arrayIndex={arrayIndex}
          customLabel={label}
          value={input}
          autoFocus={arrayIndex === filters.length - 1}
          disableRemove={arrayIndex === 0 && filters.length === 1}
          dataTestSubj={`visEditorFilterInput_${agg.id}_${arrayIndex}`}
          agg={agg}
          onChangeValue={onChangeValue}
          onRemoveFilter={onRemoveFilter}
        />
      ))}
      <EuiButton
        iconType="plusInCircle"
        fill={true}
        fullWidth={true}
        onClick={onAddFilter}
        size="s"
        data-test-subj="visEditorAddFilterButton"
      >
        <FormattedMessage
          id="visDefaultEditor.controls.filters.addFilterButtonLabel"
          defaultMessage="Add filter"
        />
      </EuiButton>
      <EuiSpacer size="m" />
    </>
  );
}

export { FiltersParamEditor };
