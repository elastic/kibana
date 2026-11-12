/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiAvatar,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPopover,
  EuiSplitPanel,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SpacesListView } from './views/spaces_list';
import type { SpacesListViewProps } from './views/spaces_list';
import { LinksList } from './links_list';
import { ContextSwitcherTriggerButton } from './context_switcher_trigger_button';
import {
  POPOVER_WIDTH_PX,
  type ContextSwitcherProps,
  type LinksListItem,
  type SpaceItem,
} from './types';
import type { SelectableListItem } from './selectable_list';

const FOOTER_LINK_IDS = new Set(['getStarted', 'addData', 'connectionDetails']);

const CONTEXT_SWITCHER_ARIA_LABEL = i18n.translate(
  'contextSwitcherComponents.proposalTwo.popoverAriaLabel',
  {
    defaultMessage: 'Spaces',
  }
);

const CREATE_NEW_SPACE_LABEL = i18n.translate(
  'contextSwitcherComponents.proposalTwo.createNewSpace',
  {
    defaultMessage: 'Create new space',
  }
);

const CLOUD_BUTTON_LABEL = i18n.translate('contextSwitcherComponents.proposalTwo.manageCloud', {
  defaultMessage: 'Manage in Cloud',
});

const mapSpaceToSelectableItem = (
  space: SpaceItem,
  activeId: string,
  showSpaceSolutions: boolean
): SelectableListItem => ({
  id: space.id,
  label: space.name,
  checked: space.id === activeId,
  prepend: space.avatar?.('s') ?? <EuiAvatar type="space" name={space.name} size="s" />,
  append:
    showSpaceSolutions && space.solution && space.solutionIcon ? (
      <EuiFlexGroup
        component="span"
        alignItems="center"
        gutterSize="xs"
        responsive={false}
        aria-label={space.solution}
      >
        <EuiFlexItem component="span" grow={false}>
          <EuiIcon type={space.solutionIcon} size="m" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem component="span" grow={false}>
          <EuiText component="span" size="s" color="subdued">
            {space.solution}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ) : (
      space.badge
    ),
  'data-test-subj': `space-${space.id}`,
});

/**
 * Proposal 2. The space name opens a popover with a project header, the space list, and footer links.
 */
export const ProposalTwoContextSwitcher = ({
  spaces,
  footerLinks,
  projectSummary,
  onOpen,
}: ContextSwitcherProps) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);

  const togglePopover = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) onOpen?.();
      return !prev;
    });
  }, [onOpen]);

  const closePopover = useCallback(() => setIsOpen(false), []);

  const selectableItems = useMemo(
    () =>
      spaces.items.map((space) =>
        mapSpaceToSelectableItem(
          space,
          spaces.active.id,
          Boolean(projectSummary?.showSpaceSolutions)
        )
      ),
    [projectSummary?.showSpaceSolutions, spaces.items, spaces.active.id]
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

  const spaceActionItems = useMemo((): LinksListItem[] => {
    const items: LinksListItem[] = [];
    const createSpace = spaces.footerAction;
    const manageSpaces = spaces.headerAction;

    if (createSpace) {
      items.push({
        id: createSpace.id,
        label: CREATE_NEW_SPACE_LABEL,
        href: createSpace.href,
        onClick: () => {
          closePopover();
          createSpace.onClick?.();
        },
        iconType: 'plus',
        disabled: createSpace.disabled,
        'data-test-subj': createSpace['data-test-subj'],
      });
    }

    if (manageSpaces) {
      items.push({
        id: manageSpaces.id,
        label: manageSpaces.label,
        href: manageSpaces.href,
        onClick: () => {
          closePopover();
          manageSpaces.onClick?.();
        },
        iconType: 'gear',
        disabled: manageSpaces.disabled,
        'data-test-subj': manageSpaces['data-test-subj'],
      });
    }

    return items;
  }, [closePopover, spaces.footerAction, spaces.headerAction]);

  const secondaryFooterItems = useMemo((): LinksListItem[] => {
    if (!footerLinks) return [];

    return footerLinks
      .filter((link) => FOOTER_LINK_IDS.has(link.id))
      .map((link) => ({
        ...link,
        onClick: () => {
          closePopover();
          link.onClick?.();
        },
      }));
  }, [closePopover, footerLinks]);

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
      panelPaddingSize="none"
      panelProps={{ 'data-test-subj': 'contextSwitcherPopoverPanel' }}
      ownFocus
      repositionOnScroll
      data-test-subj="contextSwitcherPopover"
    >
      <EuiSplitPanel.Outer direction="column" hasBorder={false} hasShadow={false}>
        <EuiSplitPanel.Inner
          color="subdued"
          paddingSize="none"
          css={css`
            padding: ${euiTheme.size.m} ${euiTheme.size.base};
          `}
        >
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            {projectSummary?.icon && (
              <EuiFlexItem grow={false}>
                <EuiIcon type={projectSummary.icon} size="m" aria-hidden={true} />
              </EuiFlexItem>
            )}
            <EuiFlexItem>
              <EuiText size="s" data-test-subj="contextSwitcherProjectSummary">
                <strong>{projectSummary?.name}</strong>
              </EuiText>
              <EuiText size="xs" color="subdued">
                {projectSummary?.description}
              </EuiText>
            </EuiFlexItem>
            {projectSummary?.href && (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={CLOUD_BUTTON_LABEL} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="cloud"
                    display="empty"
                    size="s"
                    color="text"
                    href={projectSummary.href}
                    target="_blank"
                    aria-label={CLOUD_BUTTON_LABEL}
                    data-test-subj="contextSwitcherOpenCloudButton"
                    onClick={closePopover}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner paddingSize="s">
          <SpacesListView
            id="contextSwitcherSpacesList"
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
        </EuiSplitPanel.Inner>
        {(spaceActionItems.length > 0 || secondaryFooterItems.length > 0) && (
          <EuiSplitPanel.Inner color="subdued" paddingSize="s">
            {spaceActionItems.length > 0 && <LinksList items={spaceActionItems} />}
            {spaceActionItems.length > 0 && secondaryFooterItems.length > 0 && (
              <EuiHorizontalRule margin="xs" />
            )}
            {secondaryFooterItems.length > 0 && <LinksList items={secondaryFooterItems} />}
          </EuiSplitPanel.Inner>
        )}
      </EuiSplitPanel.Outer>
    </EuiPopover>
  );
};
