/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { LayoutConfig } from '../../../lib/layout/layout_config';
import { EuiColorTokenSelect } from '../../eui_color_token_select';

interface Props {
  color: string;
  onChange: (partial: Partial<LayoutConfig>) => void;
}

export const ColorSetting = ({ color, onChange }: Props) => (
  <EuiFormRow
    data-test-subj="layoutSettingsColor"
    label={i18n.translate('kbnDesignTools.layout.settings.color', {
      defaultMessage: 'Color',
    })}
  >
    <EuiColorTokenSelect
      color={color}
      onChange={(newColor) => onChange({ color: newColor })}
      fullWidth
    />
  </EuiFormRow>
);
