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
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import dateMath from '@elastic/datemath';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { isEqual, omit } from 'lodash';
import { AggParamEditorProps } from 'ui/vis/editors/default';
import { getDocLink } from '../../documentation_links';

const generateId = htmlIdGenerator();
const isEmpty = (value: any) => value === undefined || value === null || value === '';
const validateDateMath = (value: string = '') => {
  if (isEmpty(value)) {
    return true;
  }

  const moment = dateMath.parse(value);
  return moment != null && moment.isValid();
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

  // set up an initial range when there is no default range
  useEffect(() => {
    if (!value.length) {
      onAddRange();
    }
  }, []);

  useEffect(
    () => {
      // responsible for discarding changes
      if (
        value.length !== ranges.length ||
        value.some((range, index) => !isEqual(range, omit(ranges[index], 'id')))
      ) {
        setRanges(value.map(range => ({ ...range, id: generateId() })));
      }

      setValidity(value.every(({ from, to }) => validateDateMath(from) && validateDateMath(to)));
    },
    [value]
  );

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
    <>
      {ranges.map(({ from, to, id }) => (
        <Fragment key={id}>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem>
              <EuiFieldText
                aria-label={i18n.translate('common.ui.aggTypes.dateRanges.fromColumnLabel', {
                  defaultMessage: 'From',
                  description:
                    'Describes the beginning of a date range, e.g. *From* 2018-02-26 To 2018-02-28',
                })}
                value={isEmpty(from) ? '' : from}
                onChange={ev => onChangeRange(id, 'from', ev.target.value)}
                fullWidth={true}
                isInvalid={!validateDateMath(from)}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIcon type="sortRight" color="subdued" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFieldText
                aria-label={i18n.translate('common.ui.aggTypes.dateRanges.toColumnLabel', {
                  defaultMessage: 'To',
                  description:
                    'Describes the end of a date range, e.g. From 2018-02-26 *To* 2018-02-28',
                })}
                value={isEmpty(to) ? '' : to}
                onChange={ev => onChangeRange(id, 'to', ev.target.value)}
                fullWidth={true}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                aria-label={i18n.translate(
                  'common.ui.aggTypes.dateRanges.removeRangeButtonAriaLabel',
                  {
                    defaultMessage: 'Remove the range of {from} to {to}',
                    values: { from, to },
                  }
                )}
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
      <EuiText size="xs">
        <EuiLink href={getDocLink('date.dateMath')} target="_blank" rel="noopener">
          <FormattedMessage
            id="common.ui.aggTypes.dateRanges.acceptedDateFormatsLinkText"
            defaultMessage="Accepted date formats"
          />
        </EuiLink>
      </EuiText>

      <EuiSpacer size="s" />
      <EuiFlexItem>
        <EuiButtonEmpty iconType="plusInCircleFilled" onClick={onAddRange} size="xs">
          <FormattedMessage
            id="common.ui.aggTypes.dateRanges.addRangeButtonLabel"
            defaultMessage="Add range"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </>
  );
}

export { DateRangesParamEditor };
