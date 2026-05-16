/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFormRow, EuiFlexGroup, EuiFlexItem, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiColorTokenSelect } from '../../eui_color_token_select';

interface Props {
  color: string;
  originalColor: string;
  onChange: (color: string) => void;
  onReset?: () => void;
}

export const HtmlAttributesEditor = ({ color, originalColor, onChange, onReset }: Props) => {
  return (
    <EuiFormRow
      data-test-subj="editModalBackgroundColor"
      label={i18n.translate('kbnDesignTools.edit.modal.backgroundColor', {
        defaultMessage: 'Background color',
      })}
    >
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiColorTokenSelect
            color={color || '#ffffff'}
            onChange={onChange}
            colorPickerLabel={i18n.translate('kbnDesignTools.edit.modal.backgroundColor', {
              defaultMessage: 'Background color',
            })}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('kbnDesignTools.edit.modal.resetColor', {
              defaultMessage: 'Reset to original color',
            })}
          >
            <EuiButtonIcon
              iconType="undo"
              aria-label={i18n.translate('kbnDesignTools.edit.modal.resetColorAria', {
                defaultMessage: 'Reset background color to original value',
              })}
              onClick={onReset}
              disabled={color === originalColor}
              size="s"
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
