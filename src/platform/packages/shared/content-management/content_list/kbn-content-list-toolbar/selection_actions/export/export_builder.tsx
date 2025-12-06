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
 * Props for the {@link ExportAction} marker component.
 */
export interface ExportActionProps extends BaseActionProps {
  /** Optional function to determine if the action should be shown based on selected items. */
  isVisible?: (selectedItems: ContentListItem[]) => boolean;
  /** Optional function to determine if the action should be enabled based on selected items. */
  isEnabled?: (selectedItems: ContentListItem[]) => boolean;
}

/**
 * Internal config type used by the builder after parsing.
 */
export interface ExportActionConfig {
  /** Optional function to determine if the action should be shown. */
  isVisible?: (selectedItems: ContentListItem[]) => boolean;
  /** Optional function to determine if the action should be enabled. */
  isEnabled?: (selectedItems: ContentListItem[]) => boolean;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

/**
 * Parse Export action props from a React element.
 *
 * @param element - React element representing the `ExportAction` component.
 * @returns Parsed {@link ExportActionConfig} object.
 */
export const parseProps = (element: ReactElement): ExportActionConfig => {
  const props = element.props || {};

  return {
    isVisible: props.isVisible,
    isEnabled: props.isEnabled,
    'data-test-subj': props['data-test-subj'],
  };
};

/**
 * Props for the internal ExportActionButton component.
 */
interface ExportActionButtonProps {
  config: ExportActionConfig;
  context: ActionBuilderContext;
}

/**
 * Internal component that renders the export action button.
 */
const ExportActionButton = ({ config, context }: ExportActionButtonProps) => {
  const {
    selectedCount,
    getSelectedItems,
    clearSelection,
    onSelectionExport,
    entityName,
    entityNamePlural,
  } = context;

  const handleClick = useCallback(() => {
    const items = getSelectedItems();
    onSelectionExport?.(items);
    clearSelection();
  }, [getSelectedItems, clearSelection, onSelectionExport]);

  const isDisabled = config.isEnabled ? !config.isEnabled(getSelectedItems()) : false;

  const label = i18n.translate('contentManagement.contentList.selectionActions.exportButton', {
    defaultMessage:
      '{count, plural, one {Export # {entityName}} other {Export # {entityNamePlural}}}',
    values: { count: selectedCount, entityName, entityNamePlural },
  });

  return (
    <EuiFlexItem grow={false}>
      <EuiButton
        size="m"
        color="text"
        iconType="exportAction"
        onClick={handleClick}
        disabled={isDisabled}
        data-test-subj={config['data-test-subj'] ?? 'selectionAction-export'}
      >
        {label}
      </EuiButton>
    </EuiFlexItem>
  );
};

/**
 * Build the Export action element.
 *
 * @param config - The parsed export action configuration.
 * @param context - The action builder context.
 * @returns A React element for the export button, or `null` if not applicable.
 */
export const buildAction: ActionBuilder<ExportActionConfig> = (
  config,
  context
): React.ReactElement | null => {
  const { onSelectionExport, getSelectedItems } = context;

  // Don't render if no export handler is configured.
  if (!onSelectionExport) {
    return null;
  }

  // Check custom visibility.
  if (config.isVisible) {
    const selectedItems = getSelectedItems();
    if (!config.isVisible(selectedItems)) {
      return null;
    }
  }

  return <ExportActionButton key="export" config={config} context={context} />;
};
