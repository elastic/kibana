/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SpacesListView } from './views/spaces_list';
import type { SpacesListViewProps } from './views/spaces_list';
import { ContextMenuView } from './views/context_menu';
import type { ContextMenuViewProps } from './views/context_menu';
import { ContextSubmenuView } from './views/context_submenu';
import type { ContextSubmenuViewProps } from './views/context_submenu';
import { ContextSwitcherTriggerButton } from './context_switcher_trigger_button';
import { POPOVER_WIDTH, type ContextSwitcherProps, type SpaceItem } from './types';
import type { SelectableListItem } from './selectable_list';

const SEARCH_THRESHOLD = 15;

const SUBMENU_TITLES: Record<'project' | 'deployment', string> = {
  project: i18n.translate('contextSwitcherComponents.submenuTitle.projects', {
    defaultMessage: 'My projects',
  }),
  deployment: i18n.translate('contextSwitcherComponents.submenuTitle.deployments', {
    defaultMessage: 'My deployments',
  }),
};

const SPACES_TITLE = i18n.translate('contextSwitcherComponents.spacesTitle', {
  defaultMessage: 'Spaces',
});

const CONTEXT_SWITCHER_ARIA_LABEL = i18n.translate('contextSwitcherComponents.popover.ariaLabel', {
  defaultMessage: 'Context switcher',
});

const mapSpaceToSelectableItem = (space: SpaceItem, activeId: string): SelectableListItem => ({
  id: space.id,
  label: space.name,
  checked: space.id === activeId,
  prepend: space.avatar ?? <EuiAvatar type="space" name={space.name} size="s" />,
  append: space.badge,
  'data-test-subj': `space-${space.id}`,
});

type PopoverViewId = 'root' | 'environment' | 'spaces';

interface TwoStepContentProps {
  readonly rootView: Omit<ContextMenuViewProps, 'onClickEnvironmentRow' | 'onClickSpacesRow'>;
  readonly environmentSubmenuView: Omit<ContextSubmenuViewProps, 'onBack'>;
  readonly spacesSubmenuView: Omit<SpacesListViewProps, 'onBack'>;
}

const TwoStepContent = ({
  rootView,
  environmentSubmenuView,
  spacesSubmenuView,
}: TwoStepContentProps) => {
  const [view, setView] = useState<PopoverViewId>('root');

  if (view === 'environment') {
    return <ContextSubmenuView {...environmentSubmenuView} onBack={() => setView('root')} />;
  }
  if (view === 'spaces') {
    return <SpacesListView {...spacesSubmenuView} onBack={() => setView('root')} />;
  }
  return (
    <ContextMenuView
      {...rootView}
      onClickEnvironmentRow={() => setView('environment')}
      onClickSpacesRow={() => setView('spaces')}
    />
  );
};

/**
 * The context switcher component.
 * It shows a trigger button and a popover.
 * The popover can be a single step or a two step content.
 * The single step content is the spaces list.
 * The two step content is the context menu and the spaces list.
 */
export const ContextSwitcher = ({
  spaces,
  environmentContext,
  footerLinks,
}: ContextSwitcherProps) => {
  const { euiTheme } = useEuiTheme();

  const [isOpen, setIsOpen] = useState(false);
  const togglePopover = useCallback(() => setIsOpen((prev) => !prev), []);
  const closePopover = useCallback(() => setIsOpen(false), []);

  const triggerButtonIcon = spaces.active.solutionIcon ?? 'logoElastic';

  const selectableItems = useMemo(
    () => spaces.items.map((space) => mapSpaceToSelectableItem(space, spaces.active.id)),
    [spaces.items, spaces.active.id]
  );

  const handleSpaceSelect = useCallback<SpacesListViewProps['onSelect']>(
    ({ item }) => {
      spaces.onSelect(item.id);
      closePopover();
    },
    [spaces, closePopover]
  );

  const searchConfig =
    selectableItems.length >= (spaces.search?.threshold ?? SEARCH_THRESHOLD)
      ? {
          enabled: true,
          props: {
            placeholder:
              spaces.search?.placeholder ??
              i18n.translate('contextSwitcherComponents.searchPlaceholder', {
                defaultMessage: 'Find a space',
              }),
            compressed: true,
            isClearable: true,
          },
        }
      : undefined;

  const spacesViewProps = {
    id: 'contextSwitcherSpacesList',
    title: SPACES_TITLE,
    headerAction: spaces.headerAction,
    items: selectableItems,
    onSelect: handleSpaceSelect,
    search: searchConfig,
    isLoading: spaces.isLoading,
    footerAction: spaces.footerAction,
  };

  const environmentDescription =
    environmentContext && spaces.active.solution
      ? i18n.translate('contextSwitcherComponents.environmentContext.description', {
          defaultMessage: '{solution} {kind}',
          values: {
            solution: spaces.active.solution,
            kind: environmentContext.environmentType,
          },
        })
      : undefined;

  const environmentIcon: ReactElement | undefined =
    environmentContext?.environmentType === 'project' && spaces.active.solutionIcon ? (
      <EuiAvatar
        type="space"
        name={spaces.active.solution ?? ''}
        iconType={spaces.active.solutionIcon}
        iconSize="m"
        size="l"
        color={euiTheme.colors.backgroundBaseSubdued}
      />
    ) : undefined;

  const spacesDescription =
    spaces.active.solution && environmentContext?.environmentType === 'deployment' ? (
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} component="span">
        {spaces.active.solutionIcon && (
          <EuiFlexItem grow={false} component="span">
            <EuiIcon type={spaces.active.solutionIcon} size="s" aria-hidden={true} />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false} component="span">
          {i18n.translate('contextSwitcherComponents.spacesRow.description', {
            defaultMessage: '{solution} space',
            values: { solution: spaces.active.solution },
          })}
        </EuiFlexItem>
      </EuiFlexGroup>
    ) : undefined;

  return (
    <EuiPopover
      aria-label={CONTEXT_SWITCHER_ARIA_LABEL}
      button={
        <ContextSwitcherTriggerButton
          solutionIcon={triggerButtonIcon}
          spaceName={spaces.active.name}
          onClick={togglePopover}
          isSelected={isOpen}
        />
      }
      isOpen={isOpen}
      closePopover={closePopover}
      anchorPosition="downLeft"
      panelStyle={{ width: POPOVER_WIDTH }}
      panelPaddingSize="s"
      ownFocus
      repositionOnScroll
      data-test-subj="contextSwitcherPopover"
    >
      {!environmentContext ? (
        <SpacesListView {...spacesViewProps} />
      ) : (
        <TwoStepContent
          rootView={{
            environmentRow: {
              id: environmentContext.environmentType,
              label: environmentContext.name,
              value: environmentDescription,
              prepend: environmentIcon,
            },
            spacesRow: {
              id: 'spaces',
              label: spaces.active.name,
              prepend: spaces.active.avatar ?? (
                <EuiAvatar type="space" name={spaces.active.name} size="l" />
              ),
              value: spacesDescription,
            },
            footerLinks,
          }}
          environmentSubmenuView={{
            title: SUBMENU_TITLES[environmentContext.environmentType],
            items: environmentContext.submenuItems,
            footerAction: environmentContext.submenuFooterAction,
          }}
          spacesSubmenuView={spacesViewProps}
        />
      )}
    </EuiPopover>
  );
};
