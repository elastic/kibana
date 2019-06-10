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

import React, { Fragment, useState, useEffect } from 'react';
import {
  htmlIdGenerator,
  EuiButtonIcon,
  EuiFieldNumber,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFormLabel,
  EuiSpacer,
  EuiButtonEmpty,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { isEqual, omit } from 'lodash';
import { AggParamEditorProps } from 'ui/vis/editors/default';

const generateId = htmlIdGenerator();
const isEmpty = (value: any) => value === undefined || value === null;

interface RangeValues {
  from?: number;
  to?: number;
}

interface RangeValuesModel extends RangeValues {
  id: string;
}

function RangesParamEditor({ agg, value, setValue }: AggParamEditorProps<RangeValues[]>) {
  const [ranges, setRanges] = useState(() => value.map(range => ({ ...range, id: generateId() })));

  useEffect(
    () => {
      // responsible for discarding changes
      if (
        value.length !== ranges.length ||
        value.some((range, index) => !isEqual(range, omit(ranges[index], 'id')))
      ) {
        setRanges(value.map(range => ({ ...range, id: generateId() })));
      }
    },
    [value]
  );

  const updateRanges = (rangeValues: RangeValuesModel[]) => {
    // do not set internal id parameter into saved object
    setValue(rangeValues.map(range => omit(range, 'id')));
    setRanges(rangeValues);
  };
  const onAddRange = () => updateRanges([...ranges, { id: generateId() }]);
  const onRemoveRange = (id: string) => updateRanges(ranges.filter(range => range.id !== id));
  const onChangeRange = (id: string, key: string, newValue: string) =>
    updateRanges(
      ranges.map(range =>
        range.id === id
          ? {
              ...range,
              [key]: newValue === '' ? undefined : parseFloat(newValue),
            }
          : range
      )
    );

  return (
    <>
      {ranges.map(({ from, to, id }) => (
        <Fragment key={id}>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem>
              <EuiFieldNumber
                prepend={
                  <EuiFormLabel id={`visEditorRangeFrom${agg.id}_${id}`}>
                    <FormattedMessage
                      id="common.ui.aggTypes.ranges.fromLabel"
                      defaultMessage="From"
                    />
                  </EuiFormLabel>
                }
                aria-labelledby={`visEditorRangeFrom${agg.id}_${id}`}
                value={isEmpty(from) ? '' : from}
                placeholder="&minus;∞"
                onChange={ev => onChangeRange(id, 'from', ev.target.value)}
                fullWidth={true}
                compressed={true}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFieldNumber
                prepend={
                  <EuiFormLabel id={`visEditorRangeTo${agg.id}_${id}`}>
                    <FormattedMessage id="common.ui.aggTypes.ranges.toLabel" defaultMessage="To" />
                  </EuiFormLabel>
                }
                aria-labelledby={`visEditorRangeTo${agg.id}_${id}`}
                value={isEmpty(to) ? '' : to}
                placeholder="+∞"
                onChange={ev => onChangeRange(id, 'to', ev.target.value)}
                fullWidth={true}
                compressed={true}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                aria-label={i18n.translate('common.ui.aggTypes.ranges.removeRangeButtonAriaLabel', {
                  defaultMessage: 'Remove the range of {from} to {to}',
                  values: { from: isEmpty(from) ? '-∞' : from, to: isEmpty(to) ? '+∞' : to },
                })}
                disabled={value.length === 1}
                color="danger"
                iconType="trash"
                onClick={() => onRemoveRange(id)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
        </Fragment>
      ))}

      <EuiSpacer size="s" />
      <EuiFlexItem>
        <EuiButtonEmpty iconType="plusInCircleFilled" onClick={onAddRange} size="xs">
          <FormattedMessage
            id="common.ui.aggTypes.ranges.addRangeButtonLabel"
            defaultMessage="Add range"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </>
  );
}

export { RangesParamEditor };
