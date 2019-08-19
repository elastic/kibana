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
  EuiIcon,
  EuiSpacer,
  EuiButtonEmpty,
  EuiFormRow,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { isEqual, omit } from 'lodash';

const FROM_PLACEHOLDER = '\u2212\u221E';
const TO_PLACEHOLDER = '+\u221E';

const generateId = htmlIdGenerator();
const isEmpty = (value: any) => value === undefined || value === null;

interface RangeValues {
  from?: number;
  to?: number;
}

interface RangeValuesModel extends RangeValues {
  id: string;
  isInvalid: boolean;
}

interface RangesParamEditorProps {
  value?: RangeValues[];
  hidePlaceholders?: boolean;
  setValue(value: RangeValues[]): void;
  setTouched(isTouched: boolean): void;
  addRangeValues?(): RangeValues;
  validateRange?(range: RangeValues, index: number): boolean;
}

function RangesParamEditor({
  addRangeValues,
  value = [],
  hidePlaceholders,
  setValue,
  setTouched,
  validateRange,
}: RangesParamEditorProps) {
  const [ranges, setRanges] = useState(() =>
    value.map(range => ({ ...range, id: generateId(), isInvalid: false }))
  );

  // set up an initial range when there is no default range
  useEffect(() => {
    if (!value.length) {
      onAddRange();
    }
  }, []);

  useEffect(() => {
    // responsible for discarding changes
    if (
      value.length !== ranges.length ||
      value.some((range, index) => !isEqual(range, omit(ranges[index], ['id', 'isInvalid'])))
    ) {
      setRanges(value.map(range => ({ ...range, id: generateId(), isInvalid: false })));
    }
  }, [value]);

  const updateRanges = (rangeValues: RangeValuesModel[]) => {
    // do not set internal id parameter into saved object
    setValue(rangeValues.map(range => omit(range, ['id', 'isInvalid'])));
    setRanges(rangeValues);
    setTouched(true);
  };
  const onAddRange = () =>
    addRangeValues
      ? updateRanges([...ranges, { ...addRangeValues(), id: generateId(), isInvalid: false }])
      : updateRanges([...ranges, { id: generateId(), isInvalid: false }]);
  const onRemoveRange = (id: string) => updateRanges(ranges.filter(range => range.id !== id));
  const onChangeRange = (id: string, key: string, newValue: string, isInvalid: boolean = false) =>
    updateRanges(
      ranges.map(range =>
        range.id === id
          ? {
              ...range,
              [key]: newValue === '' ? undefined : parseFloat(newValue),
              isInvalid,
            }
          : range
      )
    );

  return (
    <EuiFormRow compressed fullWidth>
      <>
        {ranges.map(({ from, to, id, isInvalid }, index) => {
          const deleteBtnTitle = i18n.translate(
            'common.ui.aggTypes.ranges.removeRangeButtonAriaLabel',
            {
              defaultMessage: 'Remove the range of {from} to {to}',
              values: {
                from: isEmpty(from) ? FROM_PLACEHOLDER : from,
                to: isEmpty(to) ? TO_PLACEHOLDER : to,
              },
            }
          );

          return (
            <Fragment key={id}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem>
                  <EuiFieldNumber
                    aria-label={i18n.translate('common.ui.aggTypes.ranges.fromLabel', {
                      defaultMessage: 'From',
                    })}
                    value={isEmpty(from) ? '' : from}
                    placeholder={hidePlaceholders ? undefined : FROM_PLACEHOLDER}
                    onChange={ev => {
                      let isRangeInvalid;

                      if (validateRange) {
                        isRangeInvalid = validateRange(
                          { from: ev.target.valueAsNumber, to },
                          index
                        );
                      }
                      onChangeRange(id, 'from', ev.target.value, isRangeInvalid);
                    }}
                    fullWidth={true}
                    compressed={true}
                    isInvalid={isInvalid}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="sortRight" color="subdued" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFieldNumber
                    aria-label={i18n.translate('common.ui.aggTypes.ranges.toLabel', {
                      defaultMessage: 'To',
                    })}
                    value={isEmpty(to) ? '' : to}
                    placeholder={hidePlaceholders ? undefined : TO_PLACEHOLDER}
                    onChange={ev => {
                      let isRangeInvalid;

                      if (validateRange) {
                        isRangeInvalid = validateRange(
                          { from, to: ev.target.valueAsNumber },
                          index
                        );
                      }
                      onChangeRange(id, 'to', ev.target.value, isRangeInvalid);
                    }}
                    fullWidth={true}
                    compressed={true}
                    isInvalid={isInvalid}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    title={deleteBtnTitle}
                    aria-label={deleteBtnTitle}
                    disabled={value.length === 1}
                    color="danger"
                    iconType="trash"
                    onClick={() => onRemoveRange(id)}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="xs" />
            </Fragment>
          );
        })}

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
    </EuiFormRow>
  );
}

export { RangesParamEditor };
