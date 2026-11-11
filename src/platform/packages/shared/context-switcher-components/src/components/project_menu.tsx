/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import {
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPopover,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { LinksList } from './links_list';
import { POPOVER_WIDTH_PX, type LinksListItem } from './types';

export interface ProjectMenuProps {
  readonly icon: IconType;
  readonly name: string;
  /** Small line under the name, e.g. "Security project". */
  readonly description: string;
  /** Actions such as "Manage this project" and "Create project". */
  readonly actions?: ReadonlyArray<LinksListItem>;
  /** Secondary links such as "Get started" and "Invite users". */
  readonly footerLinks?: ReadonlyArray<LinksListItem>;
}

const TRIGGER_ARIA_LABEL = i18n.translate('contextSwitcherComponents.projectMenu.triggerAriaLabel', {
  defaultMessage: 'Open project menu',
});

/**
 * Elastic logo button that opens the project menu. The project mark stays inside the popover.
 */
export const ProjectMenu = ({ icon, name, description, actions, footerLinks }: ProjectMenuProps) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const closePopover = useCallback(() => setIsOpen(false), []);
  const togglePopover = useCallback(() => setIsOpen((open) => !open), []);

  const withClose = useCallback(
    (item: LinksListItem): LinksListItem => ({
      ...item,
      onClick: () => {
        closePopover();
        item.onClick?.();
      },
    }),
    [closePopover]
  );

  return (
    <EuiPopover
      button={
        <button
          type="button"
          aria-label={TRIGGER_ARIA_LABEL}
          aria-expanded={isOpen}
          onClick={togglePopover}
          data-test-subj="projectMenuTrigger"
          css={css`
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            padding: 0;
            border: none;
            border-radius: 4px;
            background: transparent;
            color: inherit;
            cursor: pointer;

            svg {
              width: 20px;
              height: 20px;
            }
          `}
        >
          <EuiIcon type="logoElastic" size="l" color="text" aria-hidden={true} />
        </button>
      }
      isOpen={isOpen}
      closePopover={closePopover}
      anchorPosition="downRight"
      panelStyle={{ width: POPOVER_WIDTH_PX }}
      panelPaddingSize="s"
      panelProps={{ 'data-test-subj': 'projectMenuPopover' }}
      ownFocus
      repositionOnScroll
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiAvatar
            type="space"
            name={name}
            iconType={icon}
            size="m"
            color={euiTheme.colors.backgroundBaseSubdued}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{name}</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            {description}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      {actions && actions.length > 0 && (
        <>
          <EuiHorizontalRule margin="xs" />
          <LinksList items={actions.map(withClose)} />
        </>
      )}

      {footerLinks && footerLinks.length > 0 && (
        <>
          <EuiHorizontalRule margin="xs" />
          <LinksList items={footerLinks.map(withClose)} />
        </>
      )}
    </EuiPopover>
  );
};
