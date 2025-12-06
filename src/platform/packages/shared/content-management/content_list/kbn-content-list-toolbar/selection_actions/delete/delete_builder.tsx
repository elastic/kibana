/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import type { ReactElement } from 'react';
import { EuiButton, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ContentListItem } from '@kbn/content-list-provider';
import type { BaseActionProps, ActionBuilder, ActionBuilderContext } from '../types';

/**
 * Props for the {@link DeleteAction} marker component.
 */
export interface DeleteActionProps extends BaseActionProps {
  /** Optional function to determine if the action should be shown based on selected items. */
  isVisible?: (selectedItems: ContentListItem[]) => boolean;
  /** Optional function to determine if the action should be enabled based on selected items. */
  isEnabled?: (selectedItems: ContentListItem[]) => boolean;
}

/**
 * Internal config type used by the builder after parsing.
 */
export interface DeleteActionConfig {
  /** Optional function to determine if the action should be shown. */
  isVisible?: (selectedItems: ContentListItem[]) => boolean;
  /** Optional function to determine if the action should be enabled. */
  isEnabled?: (selectedItems: ContentListItem[]) => boolean;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

/**
 * Parse Delete action props from a React element.
 *
 * @param element - React element representing the `DeleteAction` component.
 * @returns Parsed {@link DeleteActionConfig} object.
 */
export const parseProps = (element: ReactElement): DeleteActionConfig => {
  const props = element.props || {};

  return {
    isVisible: props.isVisible,
    isEnabled: props.isEnabled,
    'data-test-subj': props['data-test-subj'],
  };
};

/**
 * Props for the internal DeleteActionButton component.
 */
interface DeleteActionButtonProps {
  config: DeleteActionConfig;
  context: ActionBuilderContext;
}

/**
 * Internal component that renders the delete action button.
 */
const DeleteActionButton = ({ config, context }: DeleteActionButtonProps) => {
  const {
    selectedCount,
    getSelectedItems,
    clearSelection,
    onSelectionDelete,
    entityName,
    entityNamePlural,
  } = context;

  const handleClick = useCallback(() => {
    const items = getSelectedItems();
    onSelectionDelete?.(items);
    clearSelection();
  }, [getSelectedItems, clearSelection, onSelectionDelete]);

  const isDisabled = config.isEnabled ? !config.isEnabled(getSelectedItems()) : false;

  const label = i18n.translate('contentManagement.contentList.selectionActions.deleteButton', {
    defaultMessage:
      '{count, plural, one {Delete # {entityName}} other {Delete # {entityNamePlural}}}',
    values: { count: selectedCount, entityName, entityNamePlural },
  });

  return (
    <EuiFlexItem grow={false}>
      <EuiButton
        size="m"
        color="danger"
        iconType="trash"
        onClick={handleClick}
        disabled={isDisabled}
        data-test-subj={config['data-test-subj'] ?? 'selectionAction-delete'}
      >
        {label}
      </EuiButton>
    </EuiFlexItem>
  );
};

/**
 * Build the Delete action element.
 *
 * @param config - The parsed delete action configuration.
 * @param context - The action builder context.
 * @returns A React element for the delete button, or `null` if not applicable.
 */
export const buildAction: ActionBuilder<DeleteActionConfig> = (
  config,
  context
): React.ReactElement | null => {
  const { onSelectionDelete, getSelectedItems } = context;

  // Don't render if no delete handler is configured.
  if (!onSelectionDelete) {
    return null;
  }

  // Check custom visibility.
  if (config.isVisible) {
    const selectedItems = getSelectedItems();
    if (!config.isVisible(selectedItems)) {
      return null;
    }
  }

  return <DeleteActionButton key="delete" config={config} context={context} />;
};
