/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import PropTypes from 'prop-types';
import React from 'react';
import { EuiComboBox } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n/react';
import { isGroupByFieldsEnabled } from '../../lib/check_ui_restrictions';

function GroupBySelectUi(props) {
  const { intl, uiRestrictions } = props;
  const modeOptions = [
    {
      label: intl.formatMessage({
        id: 'visTypeTimeseries.splits.groupBySelect.modeOptions.everythingLabel',
        defaultMessage: 'Everything',
      }),
      value: 'everything',
    },
    {
      label: intl.formatMessage({
        id: 'visTypeTimeseries.splits.groupBySelect.modeOptions.filterLabel',
        defaultMessage: 'Filter',
      }),
      value: 'filter',
    },
    {
      label: intl.formatMessage({
        id: 'visTypeTimeseries.splits.groupBySelect.modeOptions.filtersLabel',
        defaultMessage: 'Filters',
      }),
      value: 'filters',
    },
    {
      label: intl.formatMessage({
        id: 'visTypeTimeseries.splits.groupBySelect.modeOptions.termsLabel',
        defaultMessage: 'Terms',
      }),
      value: 'terms',
    },
  ].map((field) => ({
    ...field,
    disabled: !isGroupByFieldsEnabled(field.value, uiRestrictions),
  }));

  const selectedValue = props.value || 'everything';
  const selectedOption = modeOptions.find((option) => {
    return selectedValue === option.value;
  });

  return (
    <EuiComboBox
      id={props.id}
      isClearable={false}
      options={modeOptions}
      selectedOptions={[selectedOption]}
      onChange={props.onChange}
      singleSelection={{ asPlainText: true }}
      data-test-subj="groupBySelect"
    />
  );
}

GroupBySelectUi.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.string,
  uiRestrictions: PropTypes.object,
};

export const GroupBySelect = injectI18n(GroupBySelectUi);
