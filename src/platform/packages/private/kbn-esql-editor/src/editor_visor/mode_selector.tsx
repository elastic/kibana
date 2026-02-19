/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, type EuiComboBoxOptionOption } from '@elastic/eui';

export enum VisorMode {
  KQL = 'kql',
  NaturalLanguage = 'nl',
}

const kqlModeOption: EuiComboBoxOptionOption = {
  label: i18n.translate('esqlEditor.visor.modeKql', { defaultMessage: 'KQL' }),
  key: VisorMode.KQL,
};

const nlModeOption: EuiComboBoxOptionOption = {
  label: i18n.translate('esqlEditor.visor.modeNaturalLanguage', {
    defaultMessage: 'Natural Language',
  }),
  key: VisorMode.NaturalLanguage,
};

const modeOptions: EuiComboBoxOptionOption[] = [kqlModeOption, nlModeOption];

interface ModeSelectorProps {
  onModeChange: (mode: VisorMode) => void;
}

export function ModeSelector({ onModeChange }: ModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<EuiComboBoxOptionOption[]>([kqlModeOption]);

  const onChange = useCallback(
    (options: EuiComboBoxOptionOption[]) => {
      if (options.length > 0) {
        setSelectedMode(options);
        onModeChange((options[0].key as VisorMode) ?? VisorMode.KQL);
      }
    },
    [onModeChange]
  );

  return (
    <EuiComboBox
      compressed
      singleSelection={{ asPlainText: true }}
      options={modeOptions}
      selectedOptions={selectedMode}
      onChange={onChange}
      isClearable={false}
      aria-label={i18n.translate('esqlEditor.visor.modeSelectAriaLabel', {
        defaultMessage: 'Select query mode',
      })}
      data-test-subj="esqlVisorModeSelect"
    />
  );
}
