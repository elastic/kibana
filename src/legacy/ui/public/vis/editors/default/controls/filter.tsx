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
import { EuiForm, EuiButtonIcon, EuiFieldText, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AggConfig } from '../../..';
import { npStart } from '../../../../new_platform';
import { Query, QueryStringInput } from '../../../../../../../plugins/data/public';
import { Storage } from '../../../../../../../plugins/kibana_utils/public';
import { KibanaContextProvider } from '../../../../../../../plugins/kibana_react/public';
const localStorage = new Storage(window.localStorage);

interface FilterRowProps {
  id: string;
  arrayIndex: number;
  customLabel: string;
  value: Query;
  autoFocus: boolean;
  disableRemove: boolean;
  dataTestSubj: string;
  onChangeValue(id: string, query: Query, label: string): void;
  onRemoveFilter(id: string): void;
  agg: AggConfig;
}

function FilterRow({
  id,
  arrayIndex,
  customLabel,
  value,
  autoFocus,
  disableRemove,
  dataTestSubj,
  agg,
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
    <div>
      <EuiButtonIcon
        iconType="tag"
        aria-label={i18n.translate('common.ui.aggTypes.filters.toggleFilterButtonAriaLabel', {
          defaultMessage: 'Toggle filter label',
        })}
        aria-expanded={showCustomLabel}
        aria-controls={`visEditorFilterLabel${arrayIndex}`}
        onClick={() => setShowCustomLabel(!showCustomLabel)}
      />
      <EuiButtonIcon
        iconType="trash"
        color="danger"
        disabled={disableRemove}
        aria-label={i18n.translate('common.ui.aggTypes.filters.removeFilterButtonAriaLabel', {
          defaultMessage: 'Remove this filter',
        })}
        onClick={() => onRemoveFilter(id)}
      />
    </div>
  );

  // TODO: KibanaContextProvider should be raised to the top of the vis plugin
  return (
    <EuiForm>
      <EuiFormRow
        label={`${filterLabel}${customLabel ? ` - ${customLabel}` : ''}`}
        labelAppend={FilterControl}
        fullWidth={true}
      >
        <KibanaContextProvider
          services={{
            appName: 'filtersAgg',
            storage: localStorage,
            data: npStart.plugins.data,
            ...npStart.core,
          }}
        >
          <QueryStringInput
            query={value}
            indexPatterns={[agg.getIndexPattern()]}
            onChange={(query: Query) => onChangeValue(id, query, customLabel)}
            disableAutoFocus={!autoFocus}
            dataTestSubj={dataTestSubj}
            bubbleSubmitEvent={true}
            languageSwitcherPopoverAnchorPosition="leftDown"
          />
        </KibanaContextProvider>
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
          compressed
        >
          <EuiFieldText
            value={customLabel}
            placeholder={i18n.translate('common.ui.aggTypes.filters.labelPlaceholder', {
              defaultMessage: 'Label',
            })}
            onChange={ev => onChangeValue(id, value, ev.target.value)}
            fullWidth={true}
            compressed
          />
        </EuiFormRow>
      ) : null}
      <EuiSpacer size="m" />
    </EuiForm>
  );
}

export { FilterRow };
