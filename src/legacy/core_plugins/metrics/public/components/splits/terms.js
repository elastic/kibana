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

import PropTypes from 'prop-types';
import React, { Fragment } from 'react';
import { get } from 'lodash';
import GroupBySelect from './group_by_select';
import createTextHandler from '../lib/create_text_handler';
import createSelectHandler from '../lib/create_select_handler';
import FieldSelect from '../aggs/field_select';
import MetricSelect from '../aggs/metric_select';
import { htmlIdGenerator, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiFieldNumber, EuiComboBox, EuiSpacer, EuiFieldText } from '@elastic/eui';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

const DEFAULTS = { terms_direction: 'desc', terms_size: 10, terms_order_by: '_count' };

const SplitByTermsUi = ({ onChange, indexPattern, intl, model: seriesModel, fields }) => {
  const htmlId = htmlIdGenerator();
  const handleTextChange = createTextHandler(onChange);
  const handleSelectChange = createSelectHandler(onChange);
  const model = { ...DEFAULTS, ...seriesModel };
  const { metrics } = model;
  const defaultCount = {
    value: '_count',
    label: intl.formatMessage({ id: 'tsvb.splits.terms.defaultCountLabel', defaultMessage: 'Doc Count (default)' })
  };
  const terms = {
    value: '_key',
    label: intl.formatMessage({ id: 'tsvb.splits.terms.termsLabel', defaultMessage: 'Terms' })
  };

  const dirOptions = [
    {
      value: 'desc',
      label: intl.formatMessage({ id: 'tsvb.splits.terms.dirOptions.descendingLabel', defaultMessage: 'Descending' })
    },
    {
      value: 'asc',
      label: intl.formatMessage({ id: 'tsvb.splits.terms.dirOptions.ascendingLabel', defaultMessage: 'Ascending' })
    },
  ];
  const selectedDirectionOption = dirOptions.find(option => {
    return model.terms_direction === option.value;
  });
  const selectedField = (fields[indexPattern] || []).find(({ name }) => name === model.terms_field);
  const selectedFieldType = get(selectedField, 'type');

  return (
    <div>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('group')}
            label={(<FormattedMessage
              id="tsvb.splits.terms.groupByLabel"
              defaultMessage="Group by"
            />)}
          >
            <GroupBySelect
              value={model.split_mode}
              onChange={handleSelectChange('split_mode')}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('by')}
            label={(<FormattedMessage
              id="tsvb.splits.terms.byLabel"
              defaultMessage="By"
            />)}
          >
            <FieldSelect
              indexPattern={indexPattern}
              onChange={handleSelectChange('terms_field')}
              value={model.terms_field}
              fields={fields}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('top')}
            label={(<FormattedMessage
              id="tsvb.splits.terms.topLabel"
              defaultMessage="Top"
            />)}
          >
            <EuiFieldNumber
              placeholder={intl.formatMessage({ id: 'tsvb.splits.terms.sizePlaceholder', defaultMessage: 'Size' })}
              value={Number(model.terms_size)}
              onChange={handleTextChange('terms_size')}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('order')}
            label={(<FormattedMessage
              id="tsvb.splits.terms.orderByLabel"
              defaultMessage="Order by"
            />)}
          >
            <MetricSelect
              metrics={metrics}
              clearable={false}
              additionalOptions={[defaultCount, terms]}
              onChange={handleSelectChange('terms_order_by')}
              restrict="basic"
              value={model.terms_order_by}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('direction')}
            label={(<FormattedMessage
              id="tsvb.splits.terms.directionLabel"
              defaultMessage="Direction"
            />)}
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

      {selectedFieldType === 'string' && (
        <Fragment>
          <EuiSpacer />
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow
                id={htmlId('include')}
                label={(<FormattedMessage
                  id="tsvb.splits.terms.includeLabel"
                  defaultMessage="Include"
                />)}
              >
                <EuiFieldText value={model.terms_include} onChange={handleTextChange('terms_include')} />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                id={htmlId('exclude')}
                label={(<FormattedMessage
                  id="tsvb.splits.terms.excludeLabel"
                  defaultMessage="Exclude"
                />)}
              >
                <EuiFieldText value={model.terms_exclude} onChange={handleTextChange('terms_exclude')} />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </Fragment>
      )}
    </div>
  );
};

SplitByTermsUi.propTypes = {
  model: PropTypes.object,
  onChange: PropTypes.func,
  indexPattern: PropTypes.string,
  fields: PropTypes.object
};

export const SplitByTerms = injectI18n(SplitByTermsUi);
