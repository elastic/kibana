/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useState, useEffect } from 'react';
import { omit, isEqual } from 'lodash';
import { htmlIdGenerator, EuiButton, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useMount } from 'react-use';

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
