/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormPrepend,
  EuiFormRow,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { VisIconType } from '@kbn/chart-icons';
import { resolveVisIcon } from '@kbn/chart-icons';

export function hasIcon(icon: string | undefined): icon is string {
  return icon != null && icon !== 'empty';
}

export type IconSet<T extends VisIconType> = Array<{
  value: T;
  label: string;
  shouldRotate?: boolean;
}>;

const iconDecorationLabel = i18n.translate('visualizationUiComponents.iconSelect.label', {
  defaultMessage: 'Icon decoration',
});

const IconView = (props: { value?: VisIconType; label: string }) => {
  if (!props.value) return null;
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiIcon type={resolveVisIcon(props.value).icon} aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem>{props.label}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

export function IconSelect<Icon extends VisIconType>({
  value,
  onChange,
  customIconSet,
  defaultIcon = 'empty',
}: {
  value?: string;
  onChange: (newIcon: Icon) => void;
  customIconSet: IconSet<Icon>;
  defaultIcon?: VisIconType;
}) {
  const { id } = resolveVisIcon(value);
  const selectedIcon =
    customIconSet.find((option) => option.value === id) ||
    customIconSet.find((option) => option.value === defaultIcon)!;

  const { icon } = resolveVisIcon(selectedIcon.value);

  return (
    <EuiComboBox
      fullWidth
      data-test-subj="lns-icon-select"
      isClearable={false}
      options={customIconSet}
      selectedOptions={[
        {
          label: selectedIcon.label,
          value: selectedIcon.value,
        },
      ]}
      onChange={(selection) => {
        onChange(selection[0].value!);
      }}
      singleSelection={{ asPlainText: true }}
      renderOption={IconView}
      compressed
      aria-label={iconDecorationLabel}
      prepend={hasIcon(selectedIcon.value) ? <EuiFormPrepend iconLeft={icon} /> : undefined}
    />
  );
}

export function IconSelectSetting<Icon extends VisIconType>({
  currentIcon,
  setIcon,
  customIconSet,
  defaultIcon,
}: {
  currentIcon?: string;
  setIcon: (icon: Icon) => void;
  customIconSet: IconSet<Icon>;
  defaultIcon?: Icon;
}) {
  return (
    <EuiFormRow display="columnCompressed" fullWidth label={iconDecorationLabel}>
      <IconSelect
        defaultIcon={defaultIcon}
        customIconSet={customIconSet}
        value={currentIcon}
        onChange={setIcon}
      />
    </EuiFormRow>
  );
}
