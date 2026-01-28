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
import type { ContentListItem } from '@kbn/content-list-provider';
import type { ActionBuilder, ActionBuilderContext } from './types';

/**
 * Internal config type used by the builder after parsing.
 */
export interface SelectionActionConfig {
  /** Unique identifier for the action. */
  id: string;
  /** Display label for the action button. */
  label: string;
  /** EUI icon type for the action button. */
  iconType?: string;
  /** Handler function called with the selected items. */
  onSelect: (selectedItems: ContentListItem[]) => void | Promise<void>;
  /** Optional function to determine if the action should be shown. */
  isVisible?: (selectedItems: ContentListItem[]) => boolean;
  /** Optional function to determine if the action should be enabled. */
  isEnabled?: (selectedItems: ContentListItem[]) => boolean;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

/**
 * Parse SelectionAction props from a React element.
 *
 * @param element - React element representing the `SelectionAction` component.
 * @returns Parsed {@link SelectionActionConfig} object, or `null` if invalid.
 */
export const parseProps = (element: ReactElement): SelectionActionConfig | null => {
  const props = element.props || {};

  // Validate required props.
  if (!props.id) {
    // eslint-disable-next-line no-console
    console.warn('[ContentListToolbar] SelectionAction missing required "id" prop');
    return null;
  }

  if (!props.onSelect) {
    // eslint-disable-next-line no-console
    console.error(
      `[ContentListToolbar] SelectionAction "${props.id}" missing required "onSelect" handler`
    );
    return null;
  }

  return {
    id: props.id,
    label: props.label,
    iconType: props.iconType,
    onSelect: props.onSelect,
    isVisible: props.isVisible,
    isEnabled: props.isEnabled,
    'data-test-subj': props['data-test-subj'],
  };
};

/**
 * Props for the internal SelectionActionButton component.
 */
interface SelectionActionButtonProps {
  config: SelectionActionConfig;
  context: ActionBuilderContext;
}

/**
 * Internal component that renders a custom selection action button.
 */
const SelectionActionButton = ({ config, context }: SelectionActionButtonProps) => {
  const { getSelectedItems, clearSelection } = context;

  const handleClick = useCallback(async () => {
    const items = getSelectedItems();
    await config.onSelect(items);
    clearSelection();
  }, [config, getSelectedItems, clearSelection]);

  const isDisabled = config.isEnabled ? !config.isEnabled(getSelectedItems()) : false;

  return (
    <EuiFlexItem grow={false}>
      <EuiButton
        size="m"
        color="text"
        iconType={config.iconType}
        onClick={handleClick}
        disabled={isDisabled}
        data-test-subj={config['data-test-subj'] ?? `selectionAction-${config.id}`}
      >
        {config.label}
      </EuiButton>
    </EuiFlexItem>
  );
};

/**
 * Build a SelectionAction element.
 *
 * @param config - The parsed selection action configuration.
 * @param context - The action builder context.
 * @returns A React element for the selection action button, or `null` if not applicable.
 */
export const buildAction: ActionBuilder<SelectionActionConfig> = (
  config,
  context
): React.ReactElement | null => {
  const { getSelectedItems } = context;

  // Check custom visibility.
  if (config.isVisible) {
    const selectedItems = getSelectedItems();
    if (!config.isVisible(selectedItems)) {
      return null;
    }
  }

  return <SelectionActionButton key={config.id} config={config} context={context} />;
};
