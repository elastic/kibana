/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import PropTypes from 'prop-types';
import React, { useCallback } from 'react';
import { get, find } from 'lodash';
import { GroupBySelect } from './group_by_select';
import { createTextHandler } from '../lib/create_text_handler';
import { createSelectHandler } from '../lib/create_select_handler';
import { isPercentDisabled } from '../lib/stacked';
import { FieldSelect } from '../aggs/field_select';
import { MetricSelect } from '../aggs/metric_select';
import {
  htmlIdGenerator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldNumber,
  EuiComboBox,
  EuiFieldText,
} from '@elastic/eui';
import { injectI18n, FormattedMessage } from '@kbn/i18n-react';
import { KBN_FIELD_TYPES } from '../../../../../../data/public';
import { STACKED_OPTIONS } from '../../visualizations/constants';
import { getIndexPatternKey } from '../../../../common/index_patterns_utils';

const DEFAULTS = { terms_direction: 'desc', terms_size: 10, terms_order_by: '_count' };
const RESET_STATE = {
  terms_field: undefined,
  terms_include: undefined,
  terms_exclude: undefined,
  terms_direction: undefined,
  terms_size: undefined,
  terms_order_by: undefined,
};

export const SplitByTermsUI = ({
  onChange,
  indexPattern,
  intl,
  model: seriesModel,
  fields,
  uiRestrictions,
  seriesQuantity,
}) => {
  const htmlId = htmlIdGenerator();
  const handleTextChange = createTextHandler(onChange);
  const handleSelectChange = createSelectHandler(onChange);
  const model = { ...DEFAULTS, ...seriesModel };
  const { metrics } = model;
  const defaultCount = {
    value: '_count',
    label: intl.formatMessage({
      id: 'visTypeTimeseries.splits.terms.defaultCountLabel',
      defaultMessage: 'Doc Count (default)',
    }),
  };
  const terms = {
    value: '_key',
    label: intl.formatMessage({
      id: 'visTypeTimeseries.splits.terms.termsLabel',
      defaultMessage: 'Terms',
    }),
  };

  const dirOptions = [
    {
      value: 'desc',
      label: intl.formatMessage({
        id: 'visTypeTimeseries.splits.terms.dirOptions.descendingLabel',
        defaultMessage: 'Descending',
      }),
    },
    {
      value: 'asc',
      label: intl.formatMessage({
        id: 'visTypeTimeseries.splits.terms.dirOptions.ascendingLabel',
        defaultMessage: 'Ascending',
      }),
    },
  ];
  const fieldsSelector = getIndexPatternKey(indexPattern);
  const selectedDirectionOption = dirOptions.find((option) => {
    return model.terms_direction === option.value;
  });
  const selectedField = find(fields[fieldsSelector], ({ name }) => name === model.terms_field);
  const selectedFieldType = get(selectedField, 'type');

  const onTermsFieldChange = useCallback(
    (selectedOptions) => {
      onChange({
        terms_field: selectedOptions.length === 1 ? selectedOptions[0] : selectedOptions,
      });
    },
    [onChange]
  );

  if (
    seriesQuantity &&
    model.stacked === STACKED_OPTIONS.PERCENT &&
    isPercentDisabled(seriesQuantity[model.id])
  ) {
    onChange({ ['stacked']: STACKED_OPTIONS.NONE });
  }

  return (
    <div>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('group')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.splits.terms.groupByLabel"
                defaultMessage="Group by"
              />
            }
          >
            <GroupBySelect
              value={model.split_mode}
              onChange={([{ value: newSplitMode = null }]) => {
                onChange({
                  split_mode: newSplitMode,
                  ...RESET_STATE,
                });
              }}
              uiRestrictions={uiRestrictions}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <FieldSelect
            label={
              <FormattedMessage
                id="visTypeTimeseries.splits.terms.byLabel"
                defaultMessage="By"
                description="This labels a field selector allowing the user to chose 'by' which field to group."
              />
            }
            restrict={[
              KBN_FIELD_TYPES.NUMBER,
              KBN_FIELD_TYPES.BOOLEAN,
              KBN_FIELD_TYPES.DATE,
              KBN_FIELD_TYPES.IP,
              KBN_FIELD_TYPES.STRING,
            ]}
            data-test-subj="groupByField"
            indexPattern={indexPattern}
            onChange={onTermsFieldChange}
            value={model.terms_field}
            fields={fields}
            uiRestrictions={uiRestrictions}
            type={'terms'}
            allowMultiSelect={true}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {selectedFieldType === KBN_FIELD_TYPES.STRING && (
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              id={htmlId('include')}
              label={
                <FormattedMessage
                  id="visTypeTimeseries.splits.terms.includeLabel"
                  defaultMessage="Include"
                />
              }
            >
              <EuiFieldText
                value={model.terms_include}
                onChange={handleTextChange('terms_include')}
                data-test-subj="groupByInclude"
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              id={htmlId('exclude')}
              label={
                <FormattedMessage
                  id="visTypeTimeseries.splits.terms.excludeLabel"
                  defaultMessage="Exclude"
                />
              }
            >
              <EuiFieldText
                value={model.terms_exclude}
                onChange={handleTextChange('terms_exclude')}
                data-test-subj="groupByExclude"
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('top')}
            label={
              <FormattedMessage id="visTypeTimeseries.splits.terms.topLabel" defaultMessage="Top" />
            }
          >
            <EuiFieldNumber
              placeholder={intl.formatMessage({
                id: 'visTypeTimeseries.splits.terms.sizePlaceholder',
                defaultMessage: 'Size',
              })}
              value={Number(model.terms_size)}
              onChange={handleTextChange('terms_size')}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('order')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.splits.terms.orderByLabel"
                defaultMessage="Order by"
              />
            }
          >
            <MetricSelect
              metrics={metrics}
              clearable={false}
              additionalOptions={[defaultCount, terms]}
              fields={fields[fieldsSelector]}
              onChange={handleSelectChange('terms_order_by')}
              restrict="basic"
              value={model.terms_order_by}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('direction')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.splits.terms.directionLabel"
                defaultMessage="Direction"
              />
            }
          >
            <EuiComboBox
              isClearable={false}
              options={dirOptions}
              selectedOptions={selectedDirectionOption ? [selectedDirectionOption] : []}
              onChange={handleSelectChange('terms_direction')}
              singleSelection={{ asPlainText: true }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

SplitByTermsUI.propTypes = {
  intl: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func,
  indexPattern: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  fields: PropTypes.object,
  uiRestrictions: PropTypes.object,
  seriesQuantity: PropTypes.object,
};

export const SplitByTerms = injectI18n(SplitByTermsUI);
