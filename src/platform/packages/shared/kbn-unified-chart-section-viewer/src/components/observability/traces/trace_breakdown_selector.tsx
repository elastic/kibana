/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { comboBoxFieldOptionMatcher } from '@kbn/field-utils';
import {
  EMPTY_OPTION,
  ToolbarSelector,
  type SelectableEntry,
} from '@kbn/shared-ux-toolbar-selector';

interface TraceBreakdownSelectorProps {
  fields: string[];
  selectedField?: string;
  onChange: (field: string | undefined) => void;
}

export const TraceBreakdownSelector = ({
  fields,
  selectedField,
  onChange,
}: TraceBreakdownSelectorProps) => {
  const options: SelectableEntry[] = useMemo(() => {
    const fieldOptions: SelectableEntry[] = fields.map((name) => ({
      key: name,
      name,
      label: name,
      value: name,
      checked: selectedField === name ? ('on' as EuiSelectableOption['checked']) : undefined,
    }));

    fieldOptions.unshift({
      key: EMPTY_OPTION,
      value: EMPTY_OPTION,
      label: i18n.translate('metricsExperience.traces.breakdownSelector.noBreakdown', {
        defaultMessage: 'No breakdown',
      }),
      checked: !selectedField ? ('on' as EuiSelectableOption['checked']) : undefined,
    });

    return fieldOptions;
  }, [fields, selectedField]);

  const handleChange = useCallback(
    (chosenOption?: SelectableEntry) => {
      onChange(chosenOption?.value === EMPTY_OPTION ? undefined : chosenOption?.value);
    },
    [onChange]
  );

  return (
    <ToolbarSelector
      data-test-subj="traceBreakdownSelector"
      searchable
      buttonLabel={
        selectedField
          ? i18n.translate('metricsExperience.traces.breakdownSelector.breakdownBy', {
              defaultMessage: 'Breakdown by {field}',
              values: { field: selectedField },
            })
          : i18n.translate('metricsExperience.traces.breakdownSelector.noBreakdown', {
              defaultMessage: 'No breakdown',
            })
      }
      optionMatcher={comboBoxFieldOptionMatcher}
      options={options}
      onChange={handleChange}
    />
  );
};
