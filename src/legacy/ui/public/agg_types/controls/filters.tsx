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
import { AggParamEditorProps } from 'ui/vis/editors/default';
import { FormattedMessage } from '@kbn/i18n/react';
import chrome from 'ui/chrome';
import { Query } from 'plugins/data';
import { FilterRow } from './filter';

const generateId = htmlIdGenerator();
const config = chrome.getUiSettingsClient();

interface FilterValue {
  input: Query;
  label: string;
  id: string;
}

function FiltersParamEditor({ agg, value, setValue }: AggParamEditorProps<FilterValue[]>) {
  const [filters, setFilters] = useState(() =>
    value.map(filter => ({ ...filter, id: generateId() }))
  );

  useEffect(() => {
    // set parsed values into model after initialization
    setValue(filters.map(filter => omit({ ...filter, input: filter.input }, 'id')));
  }, []);

  useEffect(
    () => {
      // responsible for discarding changes
      if (
        value.length !== filters.length ||
        value.some((filter, index) => !isEqual(filter, omit(filters[index], 'id')))
      ) {
        setFilters(value.map(filter => ({ ...filter, id: generateId() })));
      }
    },
    [value]
  );

  const updateFilters = (updatedFilters: FilterValue[]) => {
    // do not set internal id parameter into saved object
    setValue(updatedFilters.map(filter => omit(filter, 'id')));
    setFilters(updatedFilters);
  };

  const onAddFilter = () =>
    updateFilters([
      ...filters,
      {
        input: { query: '', language: config.get('search:queryLanguage') },
        label: '',
        id: generateId(),
      },
    ]);
  const onRemoveFilter = (id: string) => updateFilters(filters.filter(filter => filter.id !== id));
  const onChangeValue = (id: string, query: Query, label: string) =>
    updateFilters(
      filters.map(filter =>
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
          id="common.ui.aggTypes.filters.addFilterButtonLabel"
          defaultMessage="Add filter"
        />
      </EuiButton>
      <EuiSpacer size="m" />
    </>
  );
}

export { FiltersParamEditor };
