/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, type EuiComboBoxOptionOption } from '@elastic/eui';

export enum VisorMode {
  KQL = 'kql',
  NaturalLanguage = 'nl',
}

const kqlLabel = i18n.translate('esqlEditor.visor.modeKql', { defaultMessage: 'KQL' });
const nlLabel = i18n.translate('esqlEditor.visor.modeNaturalLanguage', {
  defaultMessage: 'Natural language',
});

const modeOptions: Array<EuiComboBoxOptionOption<VisorMode>> = [
  { label: kqlLabel, value: VisorMode.KQL },
  { label: nlLabel, value: VisorMode.NaturalLanguage },
];

interface ModeSelectorProps {
  onModeChange: (mode: VisorMode) => void;
}

export function ModeSelector({ onModeChange }: ModeSelectorProps) {
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<VisorMode>>>(
    [modeOptions[0]]
  );
  const inputRefSet = useRef(false);

  const onChange = useCallback(
    (options: Array<EuiComboBoxOptionOption<VisorMode>>) => {
      if (options.length > 0) {
        setSelectedOptions(options);
        onModeChange(options[0].value!);
      }
    },
    [onModeChange]
  );

  const setInputReadOnly = useCallback((el: HTMLInputElement | null) => {
    if (el && !inputRefSet.current) {
      el.readOnly = true;
      inputRefSet.current = true;
    }
  }, []);

  return (
    <EuiComboBox
      compressed
      singleSelection={{ asPlainText: true }}
      isClearable={false}
      options={modeOptions}
      selectedOptions={selectedOptions}
      onChange={onChange}
      inputRef={setInputReadOnly}
      inputPopoverProps={{ panelMinWidth: 220 }}
      aria-label={i18n.translate('esqlEditor.visor.modeSelectAriaLabel', {
        defaultMessage: 'Select query mode',
      })}
      data-test-subj="esqlVisorModeSelect"
    />
  );
}
