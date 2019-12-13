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
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFormErrorText,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiFormRow,
} from '@elastic/eui';
import dateMath from '@elastic/datemath';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { isEqual, omit } from 'lodash';
import { getDocLink } from '../../../../documentation_links';
import { AggParamEditorProps } from '..';

const FROM_PLACEHOLDER = '\u2212\u221E';
const TO_PLACEHOLDER = '+\u221E';
const generateId = htmlIdGenerator();
const validateDateMath = (value: string = '') => {
  if (!value) {
    return true;
  }

  const moment = dateMath.parse(value);
  return moment && moment.isValid();
};

interface DateRangeValues {
  from?: string;
  to?: string;
}

interface DateRangeValuesModel extends DateRangeValues {
  id: string;
}

function DateRangesParamEditor({
  value = [],
  setValue,
  setValidity,
}: AggParamEditorProps<DateRangeValues[]>) {
  const [ranges, setRanges] = useState(() => value.map(range => ({ ...range, id: generateId() })));
  const hasInvalidRange = value.some(
    ({ from, to }) => (!from && !to) || !validateDateMath(from) || !validateDateMath(to)
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
      value.some((range, index) => !isEqual(range, omit(ranges[index], 'id')))
    ) {
      setRanges(value.map(range => ({ ...range, id: generateId() })));
    }
  }, [value]);

  useEffect(() => {
    setValidity(!hasInvalidRange);
  }, [hasInvalidRange]);

  const updateRanges = (rangeValues: DateRangeValuesModel[]) => {
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
              [key]: newValue === '' ? undefined : newValue,
            }
          : range
      )
    );

  return (
    <EuiFormRow compressed fullWidth>
      <>
        <EuiText size="xs">
          <EuiLink href={getDocLink('date.dateMath')} target="_blank">
            <FormattedMessage
              id="data.search.aggs.dateRanges.acceptedDateFormatsLinkText"
              defaultMessage="Acceptable date formats"
            />
          </EuiLink>
        </EuiText>
        <EuiSpacer size="s" />

        {ranges.map(({ from, to, id }) => {
          const deleteBtnTitle = i18n.translate(
            'data.search.aggs.dateRanges.removeRangeButtonAriaLabel',
            {
              defaultMessage: 'Remove the range of {from} to {to}',
              values: { from: from || FROM_PLACEHOLDER, to: to || TO_PLACEHOLDER },
            }
          );
          const areBothEmpty = !from && !to;

          return (
            <Fragment key={id}>
              <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
                <EuiFlexItem>
                  <EuiFieldText
                    aria-label={i18n.translate('data.search.aggs.dateRanges.fromColumnLabel', {
                      defaultMessage: 'From',
                      description:
                        'Beginning of a date range, e.g. *From* 2018-02-26 To 2018-02-28',
                    })}
                    compressed
                    fullWidth={true}
                    isInvalid={areBothEmpty || !validateDateMath(from)}
                    placeholder={FROM_PLACEHOLDER}
                    value={from || ''}
                    onChange={ev => onChangeRange(id, 'from', ev.target.value)}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="sortRight" color="subdued" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFieldText
                    aria-label={i18n.translate('data.search.aggs.dateRanges.toColumnLabel', {
                      defaultMessage: 'To',
                      description: 'End of a date range, e.g. From 2018-02-26 *To* 2018-02-28',
                    })}
                    compressed
                    fullWidth={true}
                    isInvalid={areBothEmpty || !validateDateMath(to)}
                    placeholder={TO_PLACEHOLDER}
                    value={to || ''}
                    onChange={ev => onChangeRange(id, 'to', ev.target.value)}
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

        {hasInvalidRange && (
          <EuiFormErrorText>
            <FormattedMessage
              id="data.search.aggs.dateRanges.errorMessage"
              defaultMessage="Each range should have at least one valid date."
            />
          </EuiFormErrorText>
        )}

        <EuiSpacer size="s" />
        <EuiFlexItem>
          <EuiButtonEmpty iconType="plusInCircleFilled" onClick={onAddRange} size="xs">
            <FormattedMessage
              id="data.search.aggs.dateRanges.addRangeButtonLabel"
              defaultMessage="Add range"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </>
    </EuiFormRow>
  );
}

export { DateRangesParamEditor };
