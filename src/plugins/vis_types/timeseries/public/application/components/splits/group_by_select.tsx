/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiComboBox, EuiComboBoxOptionOption, EuiComboBoxProps } from '@elastic/eui';
import { isGroupByFieldsEnabled } from '../../../../common/check_ui_restrictions';
import type { TimeseriesUIRestrictions } from '../../../../common/ui_restrictions';

interface GroupBySelectProps {
  id: string;
  onChange: EuiComboBoxProps<string>['onChange'];
  value?: string;
  uiRestrictions: TimeseriesUIRestrictions;
}

const getAvailableOptions = () => [
  {
    label: i18n.translate('visTypeTimeseries.splits.groupBySelect.modeOptions.everythingLabel', {
      defaultMessage: 'Everything',
    }),
    value: 'everything',
  },
  {
    label: i18n.translate('visTypeTimeseries.splits.groupBySelect.modeOptions.filterLabel', {
      defaultMessage: 'Filter',
    }),
    value: 'filter',
  },
  {
    label: i18n.translate('visTypeTimeseries.splits.groupBySelect.modeOptions.filtersLabel', {
      defaultMessage: 'Filters',
    }),
    value: 'filters',
  },
  {
    label: i18n.translate('visTypeTimeseries.splits.groupBySelect.modeOptions.termsLabel', {
      defaultMessage: 'Terms',
    }),
    value: 'terms',
  },
];

export const GroupBySelect = ({
  id,
  onChange,
  value = 'everything',
  uiRestrictions,
}: GroupBySelectProps) => {
  const modeOptions = getAvailableOptions().map((field) => ({
    ...field,
    disabled: !isGroupByFieldsEnabled(field.value, uiRestrictions),
  }));

  const selectedOption: EuiComboBoxOptionOption<string> | undefined = modeOptions.find(
    (option) => value === option.value
  );

  return (
    <EuiComboBox
      id={id}
      isClearable={false}
      options={modeOptions}
      selectedOptions={selectedOption ? [selectedOption] : undefined}
      onChange={onChange}
      singleSelection={{ asPlainText: true }}
      data-test-subj="groupBySelect"
    />
  );
};
