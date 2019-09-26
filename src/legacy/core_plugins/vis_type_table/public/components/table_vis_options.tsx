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

import React, { useEffect, useMemo } from 'react';
import { get } from 'lodash';
import { EuiPanel, EuiTitle, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { tabifyGetColumns } from 'ui/agg_response/tabify/_get_columns';
import { VisOptionsProps } from 'ui/vis/editors/default';
import {
  NumberInputOption,
  SwitchOption,
  SelectOption,
} from '../../../kbn_vislib_vis_types/public/components/common';
import { TableVisParams } from '../types';
import { totalAggregations, isNumeric } from './utils';

function TableOptions({
  aggs,
  aggsLabels,
  stateParams,
  setValue,
}: VisOptionsProps<TableVisParams>) {
  const noCol = useMemo(
    () => ({
      value: '',
      text: i18n.translate('visTypeTable.params.defaultPercetangeCol', {
        defaultMessage: 'Don’t show',
      }),
    }),
    []
  );
  const percentageColumns = useMemo(
    () => [
      noCol,
      ...tabifyGetColumns(aggs.getResponseAggs(), true)
        .filter(col => isNumeric(get(col, 'aggConfig.type.name'), stateParams.dimensions))
        .map(({ name }) => ({ value: name, text: name })),
    ],
    [aggs, aggsLabels, stateParams.percentageCol, stateParams.dimensions]
  );

  useEffect(() => {
    if (
      !percentageColumns.find(({ value }) => value === stateParams.percentageCol) &&
      percentageColumns[0] &&
      percentageColumns[0].value !== stateParams.percentageCol
    ) {
      setValue('percentageCol', percentageColumns[0].value);
    }
  }, [aggs, aggsLabels, percentageColumns, stateParams.percentageCol]);

  return (
    <EuiPanel paddingSize="s">
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="visTypeTable.params.showMetricsLabel.optionsTitle"
            defaultMessage="Options"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <NumberInputOption
        label={i18n.translate('visTypeTable.params.perPageLabel', {
          defaultMessage: 'Rows per page',
        })}
        paramName="perPage"
        value={stateParams.perPage}
        setValue={setValue}
      />

      <EuiSpacer size="xs" />
      <SwitchOption
        label={i18n.translate('visTypeTable.params.showMetricsLabel', {
          defaultMessage: 'Show metrics for every bucket/level',
        })}
        paramName="showMetricsAtAllLevels"
        value={stateParams.showMetricsAtAllLevels}
        setValue={setValue}
        data-test-subj="showMetricsAtAllLevels"
      />

      <SwitchOption
        label={i18n.translate('visTypeTable.params.showPartialRowsLabel', {
          defaultMessage: 'Show partial rows',
        })}
        tooltip={i18n.translate('visTypeTable.params.showPartialRowsTip', {
          defaultMessage:
            'Show rows that have partial data. This will still calculate metrics for every bucket/level, even if they are not displayed.',
        })}
        paramName="showPartialRows"
        value={stateParams.showPartialRows}
        setValue={setValue}
        data-test-subj="showPartialRows"
      />

      <SwitchOption
        label={i18n.translate('visTypeTable.params.showTotalLabel', {
          defaultMessage: 'Show total',
        })}
        paramName="showTotal"
        value={stateParams.showTotal}
        setValue={setValue}
      />

      <EuiSpacer size="xs" />
      <SelectOption
        label={i18n.translate('visTypeTable.params.totalFunctionLabel', {
          defaultMessage: 'Total function',
        })}
        disabled={!stateParams.showTotal}
        options={totalAggregations}
        paramName="totalFunc"
        value={stateParams.totalFunc}
        setValue={setValue}
      />

      <SelectOption
        label={i18n.translate('visTypeTable.params.PercentageColLabel', {
          defaultMessage: 'Percentage column',
        })}
        options={percentageColumns}
        paramName="percentageCol"
        value={stateParams.percentageCol}
        setValue={setValue}
        id="datatableVisualizationPercentageCol"
      />
    </EuiPanel>
  );
}

export { TableOptions };
