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

import React, { useState } from 'react';
import {
  EuiForm,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiFieldText,
  EuiFormRow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface FilterRowProps {
  id: string;
  arrayIndex: number;
  customLabel: string;
  value: string;
  autoFocus: boolean;
  disableRemove: boolean;
  dataTestSubj: string;
  onChangeValue(id: string, query: string, label: string): void;
  onRemoveFilter(id: string): void;
}

function FilterRow({
  id,
  arrayIndex,
  customLabel,
  value,
  autoFocus,
  disableRemove,
  dataTestSubj,
  onChangeValue,
  onRemoveFilter,
}: FilterRowProps) {
  const [showCustomLabel, setShowCustomLabel] = useState(false);
  const filterLabel = i18n.translate('common.ui.aggTypes.filters.filterLabel', {
    defaultMessage: 'Filter {index}',
    values: {
      index: arrayIndex + 1,
    },
  });

  const FilterControl = (
    <EuiFlexGroup gutterSize="s" responsive={false}>
      <EuiFlexItem>
        <EuiButtonIcon
          iconType="tag"
          aria-label={i18n.translate('common.ui.aggTypes.filters.toggleFilterButtonAriaLabel', {
            defaultMessage: 'Toggle filter label',
          })}
          aria-expanded={showCustomLabel}
          aria-controls={`visEditorFilterLabel${arrayIndex}`}
          onClick={() => setShowCustomLabel(!showCustomLabel)}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButtonIcon
          iconType="trash"
          color="danger"
          disabled={disableRemove}
          aria-label={i18n.translate('common.ui.aggTypes.filters.removeFilterButtonAriaLabel', {
            defaultMessage: 'Remove this filter',
          })}
          onClick={() => onRemoveFilter(id)}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <EuiForm>
      <EuiFormRow
        label={`${filterLabel}${customLabel ? ` - ${customLabel}` : ''}`}
        labelAppend={FilterControl}
        fullWidth={true}
        className="visEditorSidebar__aggParamFormRow"
      >
        <EuiFieldText
          value={value}
          placeholder={i18n.translate('common.ui.aggTypes.filters.filterPlaceholder', {
            defaultMessage: 'Lucene or Query DSL',
          })}
          data-test-subj={dataTestSubj}
          onChange={ev => onChangeValue(id, ev.target.value, customLabel)}
          fullWidth={true}
          autoFocus={autoFocus}
        />
      </EuiFormRow>
      {showCustomLabel ? (
        <EuiFormRow
          id={`visEditorFilterLabel${arrayIndex}`}
          label={i18n.translate('common.ui.aggTypes.filters.definiteFilterLabel', {
            defaultMessage: 'Filter {index} label',
            description:
              "'Filter {index}' represents the name of the filter as a noun, similar to 'label for filter 1'.",
            values: {
              index: arrayIndex + 1,
            },
          })}
          fullWidth={true}
          className="visEditorSidebar__aggParamFormRow"
        >
          <EuiFieldText
            value={customLabel}
            placeholder={i18n.translate('common.ui.aggTypes.filters.labelPlaceholder', {
              defaultMessage: 'Label',
            })}
            onChange={ev => onChangeValue(id, value, ev.target.value)}
            fullWidth={true}
          />
        </EuiFormRow>
      ) : null}
    </EuiForm>
  );
}

export { FilterRow };
