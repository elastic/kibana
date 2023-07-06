/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  IconType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function hasIcon(icon: string | undefined): icon is string {
  return icon != null && icon !== 'empty';
}

export type IconSet<T> = Array<{
  value: T;
  label: string;
  icon?: T | IconType;
  shouldRotate?: boolean;
}>;

const IconView = (props: { value?: string; label: string; icon?: IconType }) => {
  if (!props.value) return null;
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiIcon type={props.icon ?? props.value} />
      </EuiFlexItem>
      <EuiFlexItem>{props.label}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

export function IconSelect<Icon extends string>({
  value,
  onChange,
  customIconSet,
  defaultIcon = 'empty',
}: {
  value?: Icon;
  onChange: (newIcon: Icon) => void;
  customIconSet: IconSet<Icon>;
  defaultIcon?: string;
}) {
  const selectedIcon =
    customIconSet.find((option) => value === option.value) ||
    customIconSet.find((option) => option.value === defaultIcon)!;

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
      prepend={
        hasIcon(selectedIcon.value) ? (
          <EuiIcon type={selectedIcon.icon ?? selectedIcon.value} />
        ) : undefined
      }
    />
  );
}

export function IconSelectSetting<Icon extends string = string>({
  currentIcon,
  setIcon,
  customIconSet,
  defaultIcon = 'empty',
}: {
  currentIcon?: Icon;
  setIcon: (icon: Icon) => void;
  customIconSet: IconSet<Icon>;
  defaultIcon?: string;
}) {
  return (
    <EuiFormRow
      display="columnCompressed"
      fullWidth
      label={i18n.translate('visualizationUiComponents.iconSelect.label', {
        defaultMessage: 'Icon decoration',
      })}
    >
      <IconSelect
        defaultIcon={defaultIcon}
        customIconSet={customIconSet}
        value={currentIcon}
        onChange={setIcon}
      />
    </EuiFormRow>
  );
}
