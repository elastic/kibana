/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type KindType = 'signal' | 'alert';

// UI selection maps to form value
type KindSelection = 'monitor' | 'alert';

const KIND_OPTIONS: Array<{ id: KindSelection; label: string }> = [
  {
    id: 'alert',
    label: i18n.translate('xpack.esqlRuleForm.kindField.alertOption', {
      defaultMessage: 'Alert',
    }),
  },
  {
    id: 'monitor',
    label: i18n.translate('xpack.esqlRuleForm.kindField.monitorOption', {
      defaultMessage: 'Monitor',
    }),
  },
];

// Maps UI selection to form value
const selectionToKind: Record<KindSelection, KindType> = {
  monitor: 'signal',
  alert: 'alert',
};

// Maps form value to UI selection
const kindToSelection: Record<KindType, KindSelection> = {
  signal: 'monitor',
  alert: 'alert',
};

interface Props {
  value?: KindType;
  onChange: (value: KindType) => void;
}

export const KindField = React.forwardRef<HTMLDivElement, Props>(({ value, onChange }, ref) => {
  const selectedId = value ? kindToSelection[value] : 'monitor';

  const handleChange = (id: string) => {
    const selection = id as KindSelection;
    onChange(selectionToKind[selection]);
  };

  return (
    <div ref={ref}>
      <EuiButtonGroup
        legend={i18n.translate('xpack.esqlRuleForm.kindField.legend', {
          defaultMessage: 'Rule kind',
        })}
        options={KIND_OPTIONS}
        idSelected={selectedId}
        onChange={handleChange}
        buttonSize="m"
        color="primary"
        isFullWidth
        data-test-subj="kindField"
      />
    </div>
  );
});
