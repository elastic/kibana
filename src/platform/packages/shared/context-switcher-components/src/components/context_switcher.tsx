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
import type { ActionConfig, LinksListItem } from './types';
import { POPOVER_WIDTH_PX, type ContextSwitcherProps, type SpaceItem } from './types';
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
  defaultMessage: 'My spaces',
});

const CONTEXT_SWITCHER_ARIA_LABEL = i18n.translate('contextSwitcherComponents.popover.ariaLabel', {
  defaultMessage: 'Context switcher',
});

const mapSpaceToSelectableItem = (space: SpaceItem, activeId: string): SelectableListItem => ({
  id: space.id,
  label: space.name,
  checked: space.id === activeId,
  prepend: space.avatar?.('s') ?? <EuiAvatar type="space" name={space.name} size="s" />,
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
  iconOnly = false,
  spaces,
  environmentContext,
  footerLinks,
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

  const isProject = environmentContext?.environmentType === 'project';
  const isDeployment = environmentContext?.environmentType === 'deployment';

  const triggerButtonIcon = spaces.active.solutionIcon ?? 'logoElastic';

  const selectableItems = useMemo(
    () => spaces.items.map((space) => mapSpaceToSelectableItem(space, spaces.active.id)),
    [spaces.items, spaces.active.id]
  );

  const triggerLabel = useMemo(() => {
    if (!environmentContext) {
      return spaces.active.name;
    }
    if (spaces.items.length <= 1) {
      return environmentContext.name;
    }
    return `${environmentContext.name}: ${spaces.active.name}`;
  }, [environmentContext, spaces.active.name, spaces.items.length]);

  const handleSpaceSelect = useCallback<SpacesListViewProps['onSelect']>(
    ({ item }) => {
      spaces.onSelect(item.id);
      closePopover();
    },
    [spaces, closePopover]
  );

  const withClosePopover = useCallback(
    (onClick?: () => void) => () => {
      closePopover();
      onClick?.();
    },
    [closePopover]
  );

  const withClosePopoverAction = useCallback(
    (action?: ActionConfig): ActionConfig | undefined =>
      action ? { ...action, onClick: withClosePopover(action.onClick) } : undefined,
    [withClosePopover]
  );
  const withClosePopoverLink = useCallback(
    (item: LinksListItem): LinksListItem => ({ ...item, onClick: withClosePopover(item.onClick) }),
    [withClosePopover]
  );

  const footerLinksWithClose = useMemo(
    () => footerLinks?.map(withClosePopoverLink),
    [footerLinks, withClosePopoverLink]
  );

  const environmentItemsWithClose = useMemo(
    () => environmentContext?.submenuItems.map(withClosePopoverLink) ?? [],
    [environmentContext, withClosePopoverLink]
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
            isClearable: true,
          },
        }
      : undefined;

  const spacesViewProps = {
    id: 'contextSwitcherSpacesList',
    title: SPACES_TITLE,
    headerAction: withClosePopoverAction(spaces.headerAction),
    items: selectableItems,
    onSelect: handleSpaceSelect,
    search: searchConfig,
    isLoading: spaces.isLoading,
    footerAction: withClosePopoverAction(spaces.footerAction),
  };

  const environmentDescription = isProject
    ? i18n.translate('contextSwitcherComponents.environmentContext.projectDescription', {
        defaultMessage: '{solution} project',
        values: { solution: spaces.active.solution },
      })
    : i18n.translate('contextSwitcherComponents.environmentContext.deploymentDescription', {
        defaultMessage: 'Deployment',
      });

  const environmentIcon: ReactElement | undefined =
    isProject && spaces.active.solutionIcon ? (
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
    isDeployment && spaces.active.solution ? (
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} component="span">
        {spaces.active.solutionIcon && (
          <EuiFlexItem grow={false} component="span">
            <EuiIcon type={spaces.active.solutionIcon} size="s" aria-hidden={true} />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false} component="span">
          {i18n.translate('contextSwitcherComponents.spacesRow.solutionDescription', {
            defaultMessage: '{solution} space',
            values: { solution: spaces.active.solution },
          })}
        </EuiFlexItem>
      </EuiFlexGroup>
    ) : (
      i18n.translate('contextSwitcherComponents.spacesRow.simpleDescription', {
        defaultMessage: 'Space',
      })
    );

  return (
    <EuiPopover
      aria-label={CONTEXT_SWITCHER_ARIA_LABEL}
      button={
        <ContextSwitcherTriggerButton
          solutionIcon={triggerButtonIcon}
          label={triggerLabel}
          onClick={togglePopover}
          isSelected={isOpen}
          iconOnly={iconOnly}
        />
      }
      isOpen={isOpen}
      closePopover={closePopover}
      anchorPosition={iconOnly ? 'rightUp' : 'downLeft'}
      panelStyle={{ width: POPOVER_WIDTH_PX }}
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
              'data-test-subj': 'contextSwitcherEnvironmentRow',
            },
            spacesRow: {
              id: 'spaces',
              label: spaces.active.name,
              prepend: spaces.active.avatar?.('l') ?? (
                <EuiAvatar type="space" name={spaces.active.name} size="l" />
              ),
              value: spacesDescription,
              'data-test-subj': 'contextSwitcherSpacesRow',
            },
            footerLinks: footerLinksWithClose,
          }}
          environmentSubmenuView={{
            title: SUBMENU_TITLES[environmentContext.environmentType],
            items: environmentItemsWithClose,
            footerAction: withClosePopoverAction(environmentContext.submenuFooterAction),
          }}
          spacesSubmenuView={spacesViewProps}
        />
      )}
    </EuiPopover>
  );
};
