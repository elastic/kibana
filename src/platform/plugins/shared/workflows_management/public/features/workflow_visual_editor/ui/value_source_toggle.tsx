/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonGroup } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

export type ValueSource = 'fixed' | 'data';

/** Neutral Fixed | Data switch for controls that hold a typed value or a whole reference. */
export function ValueSourceToggle({
  source,
  fieldLabel,
  onChange,
  'data-test-subj': dataTestSubj,
}: {
  readonly source: ValueSource;
  /** Label of the field the switch belongs to; names the group for screen readers. */
  readonly fieldLabel: string;
  readonly onChange: (next: ValueSource) => void;
  readonly 'data-test-subj': string;
}) {
  const fixedId = `${dataTestSubj}-fixed`;
  const dataId = `${dataTestSubj}-data`;
  return (
    <EuiButtonGroup
      type="single"
      buttonSize="compressed"
      color="text"
      legend={i18n.translate('workflows.stepConfigPanel.valueSource.legend', {
        defaultMessage: 'Value source for {field}',
        values: { field: fieldLabel },
      })}
      idSelected={source === 'fixed' ? fixedId : dataId}
      onChange={(id) => onChange(id === fixedId ? 'fixed' : 'data')}
      options={[
        {
          id: fixedId,
          label: i18n.translate('workflows.stepConfigPanel.valueSource.fixed', {
            defaultMessage: 'Fixed',
          }),
          'data-test-subj': fixedId,
        },
        {
          id: dataId,
          label: i18n.translate('workflows.stepConfigPanel.valueSource.data', {
            defaultMessage: 'Data',
          }),
          'data-test-subj': dataId,
        },
      ]}
      data-test-subj={dataTestSubj}
    />
  );
}
