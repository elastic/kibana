/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import classNames from 'classnames';
import { EuiIcon, EuiFlexItem, EuiFlexGroup, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DropType } from '../types';
import { DEFAULT_DATA_TEST_SUBJ } from '../constants';

function getPropsForDropType(type: 'swap' | 'duplicate' | 'combine') {
  switch (type) {
    case 'duplicate':
      return {
        icon: 'copy',
        label: i18n.translate('domDragDrop.dropTargets.duplicate', {
          defaultMessage: 'Duplicate',
        }),
        controlKey: i18n.translate('domDragDrop.dropTargets.altOption', {
          defaultMessage: 'Alt/Option',
        }),
      };

    case 'swap':
      return {
        icon: 'merge',
        label: i18n.translate('domDragDrop.dropTargets.swap', {
          defaultMessage: 'Swap',
        }),
        controlKey: i18n.translate('domDragDrop.dropTargets.shift', {
          defaultMessage: 'Shift',
        }),
      };
    case 'combine':
      return {
        icon: 'aggregate',
        label: i18n.translate('domDragDrop.dropTargets.combine', {
          defaultMessage: 'Combine',
        }),
        controlKey: i18n.translate('domDragDrop.dropTargets.control', {
          defaultMessage: 'Control',
        }),
      };
    default:
      throw Error('Drop type not supported');
  }
}

const getExtraTarget = ({
  type,
  isIncompatible,
}: {
  type: 'swap' | 'duplicate' | 'combine';
  isIncompatible?: boolean;
}) => {
  const { icon, label, controlKey } = getPropsForDropType(type);
  return (
    <EuiFlexGroup
      gutterSize="s"
      justifyContent="spaceBetween"
      alignItems="center"
      className={classNames('domDroppable__extraTarget', {
        'domDroppable--incompatibleExtraTarget': isIncompatible,
      })}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon size="m" type={icon} />
          </EuiFlexItem>
          <EuiFlexItem grow={false} data-test-subj={`${DEFAULT_DATA_TEST_SUBJ}-dropTarget-${type}`}>
            <EuiText size="s">{label}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <code> {controlKey}</code>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const customDropTargetsMap: Partial<{ [dropType in DropType]: React.ReactElement }> = {
  replace_duplicate_incompatible: getExtraTarget({ type: 'duplicate', isIncompatible: true }),
  duplicate_incompatible: getExtraTarget({ type: 'duplicate', isIncompatible: true }),
  swap_incompatible: getExtraTarget({ type: 'swap', isIncompatible: true }),
  replace_duplicate_compatible: getExtraTarget({ type: 'duplicate' }),
  duplicate_compatible: getExtraTarget({ type: 'duplicate' }),
  swap_compatible: getExtraTarget({ type: 'swap' }),
  field_combine: getExtraTarget({ type: 'combine' }),
  combine_compatible: getExtraTarget({ type: 'combine' }),
  combine_incompatible: getExtraTarget({ type: 'combine', isIncompatible: true }),
};

export const getCustomDropTarget = (dropType: DropType) => customDropTargetsMap?.[dropType] || null;

export const getAdditionalClassesOnEnter = (dropType?: string) => {
  if (
    dropType &&
    [
      'field_replace',
      'replace_compatible',
      'replace_incompatible',
      'replace_duplicate_compatible',
      'replace_duplicate_incompatible',
    ].includes(dropType)
  ) {
    return 'domDroppable--replacing';
  }
};

export const getAdditionalClassesOnDroppable = (dropType?: string) => {
  if (
    dropType &&
    [
      'move_incompatible',
      'replace_incompatible',
      'swap_incompatible',
      'duplicate_incompatible',
      'replace_duplicate_incompatible',
      'combine_incompatible',
    ].includes(dropType)
  ) {
    return 'domDroppable--incompatible';
  }
};
