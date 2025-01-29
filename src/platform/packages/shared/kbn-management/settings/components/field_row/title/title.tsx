/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { Interpolation, Theme } from '@emotion/react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { FieldDefinition, UnsavedFieldChange, SettingType } from '@kbn/management-settings-types';

import { useFieldStyles } from '../field_row.styles';
import { FieldTitleCustomIcon } from './icon_custom';
import { FieldTitleUnsavedIcon } from './icon_unsaved';

/**
 * Props for a {@link FieldTitle} component.
 */
export interface TitleProps<T extends SettingType> {
  /** The {@link FieldDefinition} corresponding the setting. */
  field: Pick<
    FieldDefinition<T>,
    'displayName' | 'savedValue' | 'isCustom' | 'id' | 'type' | 'isOverridden'
  >;
  /** Emotion-based `css` for the root React element. */
  css?: Interpolation<Theme>;
  /** Classname for the root React element. */
  className?: string;
  /** The {@link UnsavedFieldChange} corresponding to any unsaved change to the field. */
  unsavedChange?: UnsavedFieldChange<T>;
}

/**
 * Component for displaying the `displayName` and status of a {@link FieldDefinition} in
 * the {@link FieldRow}.
 */
export const FieldTitle = <T extends SettingType>({
  field,
  unsavedChange,
  ...props
}: TitleProps<T>) => {
  const { cssFieldTitle } = useFieldStyles({
    field,
    unsavedChange,
  });

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false} css={cssFieldTitle}>
        <h3 {...props}>{field.displayName}</h3>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <FieldTitleCustomIcon {...{ field }} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <FieldTitleUnsavedIcon {...{ field, unsavedChange }} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
