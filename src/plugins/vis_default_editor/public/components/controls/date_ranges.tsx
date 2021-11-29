/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, useState, useEffect, useCallback } from 'react';
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
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { isEqual, omit } from 'lodash';
import useMount from 'react-use/lib/useMount';
import { DocLinksStart } from 'src/core/public';

import { useKibana } from '../../../../kibana_react/public';
import { AggParamEditorProps } from '../agg_param_props';

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
  const { services } = useKibana<{ docLinks: DocLinksStart }>();
  const [ranges, setRanges] = useState(() =>
    value.map((range) => ({ ...range, id: generateId() }))
  );
  const hasInvalidRange = value.some(
    ({ from, to }) => (!from && !to) || !validateDateMath(from) || !validateDateMath(to)
  );

  const updateRanges = useCallback(
    (rangeValues: DateRangeValuesModel[]) => {
      // do not set internal id parameter into saved object
      setValue(rangeValues.map((range) => omit(range, 'id')));
      setRanges(rangeValues);
    },
    [setValue]
  );

  const onAddRange = useCallback(
    () => updateRanges([...ranges, { id: generateId() }]),
    [ranges, updateRanges]
  );

  useMount(() => {
    // set up an initial range when there is no default range
    if (!value.length) {
      onAddRange();
    }
  });

  useEffect(() => {
    // responsible for discarding changes
    if (
      value.length !== ranges.length ||
      value.some((range, index) => !isEqual(range, omit(ranges[index], 'id')))
    ) {
      setRanges(value.map((range) => ({ ...range, id: generateId() })));
    }
  }, [ranges, value]);

  useEffect(() => {
    setValidity(!hasInvalidRange);
  }, [hasInvalidRange, setValidity]);

  const onRemoveRange = (id: string) => updateRanges(ranges.filter((range) => range.id !== id));
  const onChangeRange = (id: string, key: string, newValue: string) =>
    updateRanges(
      ranges.map((range) =>
        range.id === id
          ? {
              ...range,
              [key]: newValue === '' ? undefined : newValue,
            }
          : range
      )
    );

  return (
    <EuiFormRow display="rowCompressed" fullWidth>
      <>
        <EuiText size="xs">
          <EuiLink href={services.docLinks.links.date.dateMath} target="_blank">
            <FormattedMessage
              id="visDefaultEditor.controls.dateRanges.acceptedDateFormatsLinkText"
              defaultMessage="Acceptable date formats"
            />
          </EuiLink>
        </EuiText>
        <EuiSpacer size="s" />

        {ranges.map(({ from, to, id }, index) => {
          const deleteBtnTitle = i18n.translate(
            'visDefaultEditor.controls.dateRanges.removeRangeButtonAriaLabel',
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
                    aria-label={i18n.translate(
                      'visDefaultEditor.controls.dateRanges.fromColumnLabel',
                      {
                        defaultMessage: 'From',
                        description:
                          'Beginning of a date range, e.g. *From* 2018-02-26 To 2018-02-28',
                      }
                    )}
                    compressed
                    fullWidth={true}
                    isInvalid={areBothEmpty || !validateDateMath(from)}
                    placeholder={FROM_PLACEHOLDER}
                    value={from || ''}
                    onChange={(ev) => onChangeRange(id, 'from', ev.target.value)}
                    data-test-subj={`visEditorDateRange${index}__from`}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="sortRight" color="subdued" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFieldText
                    aria-label={i18n.translate(
                      'visDefaultEditor.controls.dateRanges.toColumnLabel',
                      {
                        defaultMessage: 'To',
                        description: 'End of a date range, e.g. From 2018-02-26 *To* 2018-02-28',
                      }
                    )}
                    data-test-subj={`visEditorDateRange${index}__to`}
                    compressed
                    fullWidth={true}
                    isInvalid={areBothEmpty || !validateDateMath(to)}
                    placeholder={TO_PLACEHOLDER}
                    value={to || ''}
                    onChange={(ev) => onChangeRange(id, 'to', ev.target.value)}
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
              id="visDefaultEditor.controls.dateRanges.errorMessage"
              defaultMessage="Each range should have at least one valid date."
            />
          </EuiFormErrorText>
        )}

        <EuiSpacer size="s" />
        <EuiFlexItem>
          <EuiButtonEmpty
            iconType="plusInCircleFilled"
            onClick={onAddRange}
            size="xs"
            data-test-subj="visEditorAddDateRange"
          >
            <FormattedMessage
              id="visDefaultEditor.controls.dateRanges.addRangeButtonLabel"
              defaultMessage="Add range"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </>
    </EuiFormRow>
  );
}

export { DateRangesParamEditor };
