/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiAvatar, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SpacesListView } from './views/spaces_list';
import type { SpacesListViewProps } from './views/spaces_list';
import { ContextSwitcherTriggerButton } from './context_switcher_trigger_button';
import { OriginalContextSwitcher } from './original_context_switcher';
import { ProposalTwoContextSwitcher } from './proposal_two_context_switcher';
import type { ActionConfig } from './types';
import { POPOVER_WIDTH_PX, type ContextSwitcherProps, type SpaceItem } from './types';
import type { SelectableListItem } from './selectable_list';

const CONTEXT_SWITCHER_ARIA_LABEL = i18n.translate('contextSwitcherComponents.popover.ariaLabel', {
  defaultMessage: 'Spaces',
});

const mapSpaceToSelectableItem = (space: SpaceItem, activeId: string): SelectableListItem => ({
  id: space.id,
  label: space.name,
  checked: space.id === activeId,
  prepend: space.avatar?.('s') ?? <EuiAvatar type="space" name={space.name} size="s" />,
  append: space.badge,
  'data-test-subj': `space-${space.id}`,
});

/**
 * Space switcher for proposal 1. Opens directly onto the list of spaces.
 */
const ProposalContextSwitcher = ({ spaces, onOpen }: ContextSwitcherProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const togglePopover = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) onOpen?.();
      return !prev;
    });
  }, [onOpen]);

  const closePopover = useCallback(() => setIsOpen(false), []);

  const selectableItems = useMemo(
    () => spaces.items.map((space) => mapSpaceToSelectableItem(space, spaces.active.id)),
    [spaces.items, spaces.active.id]
  );

  const handleSpaceSelect = useCallback<SpacesListViewProps['onSelect']>(
    ({ item, event }) => {
      spaces.onSelect(item.id, event);

      if (event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }

      closePopover();
    },
    [spaces, closePopover]
  );

  const withClosePopoverAction = useCallback(
    (action?: ActionConfig): ActionConfig | undefined =>
      action
        ? {
            ...action,
            onClick: () => {
              closePopover();
              action.onClick?.();
            },
          }
        : undefined,
    [closePopover]
  );

  return (
    <EuiPopover
      aria-label={CONTEXT_SWITCHER_ARIA_LABEL}
      button={
        <ContextSwitcherTriggerButton
          label={spaces.active.name}
          spaceName={spaces.active.name}
          onClick={togglePopover}
          isSelected={isOpen}
        />
      }
      isOpen={isOpen}
      closePopover={closePopover}
      anchorPosition="downLeft"
      panelStyle={{ width: POPOVER_WIDTH_PX }}
      panelPaddingSize="s"
      panelProps={{ 'data-test-subj': 'contextSwitcherPopoverPanel' }}
      ownFocus
      repositionOnScroll
      data-test-subj="contextSwitcherPopover"
    >
      <SpacesListView
        id="contextSwitcherSpacesList"
        headerAction={withClosePopoverAction(spaces.headerAction)}
        footerAction={withClosePopoverAction(spaces.footerAction)}
        items={selectableItems}
        onSelect={handleSpaceSelect}
        isLoading={spaces.isLoading}
        noMatchesMessage={
          <FormattedMessage
            id="contextSwitcherComponents.spacesList.noSpacesFound"
            defaultMessage="No spaces found"
          />
        }
      />
    </EuiPopover>
  );
};

/**
 * Header context switcher. `variant` selects the original menu, proposal 1, proposal 2, or proposal 3.
 */
export const ContextSwitcher = (props: ContextSwitcherProps) => {
  if (props.variant === 'original' || props.variant === 'proposal3') {
    return <OriginalContextSwitcher {...props} />;
  }

  if (props.variant === 'proposal2') {
    return <ProposalTwoContextSwitcher {...props} />;
  }

  return <ProposalContextSwitcher {...props} />;
};
