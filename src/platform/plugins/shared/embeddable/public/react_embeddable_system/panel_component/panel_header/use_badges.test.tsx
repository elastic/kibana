/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { PANEL_BADGE_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { triggers } from '@kbn/ui-actions-plugin/public';
import type { Action, ActionMenuItemProps } from '@kbn/ui-actions-plugin/public';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { useBadges } from './use_badges';

const mockApi = { uuid: 'test-api' };

/** Thin wrapper so we can render the hook's returned elements into the DOM. */
const BadgeHost = ({
  showBadges,
  api,
  getActions,
}: {
  showBadges: boolean;
  api: typeof mockApi;
  getActions: (triggerId: string, context: object) => Promise<Action<EmbeddableApiContext>[]>;
}) => {
  const badges = useBadges(showBadges, api, getActions);
  return <>{badges}</>;
};

const makeGetActions = (actions: Array<Action<EmbeddableApiContext>>) =>
  jest.fn().mockResolvedValue(actions);

describe('useBadges', () => {
  describe('MenuItem branch', () => {
    it('renders the MenuItem component directly with context and dataTestSubj instead of an EuiBadge shell', async () => {
      const MenuItem = jest.fn(({ dataTestSubj }: ActionMenuItemProps<EmbeddableApiContext>) => (
        <span data-test-subj={dataTestSubj} data-badge-type="menu-item" />
      ));

      const action = {
        id: 'menuItemBadge',
        MenuItem,
        isCompatible: jest.fn().mockResolvedValue(true),
        getDisplayName: jest.fn().mockReturnValue('MenuItem Badge'),
        getIconType: jest.fn(),
        execute: jest.fn(),
      } as unknown as Action<EmbeddableApiContext>;

      render(<BadgeHost showBadges api={mockApi} getActions={makeGetActions([action])} />);

      await waitFor(() =>
        expect(screen.getByTestId('embeddablePanelBadge-menuItemBadge')).toBeInTheDocument()
      );

      // The rendered element must be the MenuItem component output, not an EuiBadge button
      expect(screen.getByTestId('embeddablePanelBadge-menuItemBadge')).toHaveAttribute(
        'data-badge-type',
        'menu-item'
      );

      // MenuItem must receive the correct dataTestSubj and the full action context
      expect(MenuItem).toHaveBeenCalledWith(
        expect.objectContaining({
          dataTestSubj: 'embeddablePanelBadge-menuItemBadge',
          context: expect.objectContaining({
            embeddable: mockApi,
            trigger: triggers[PANEL_BADGE_TRIGGER],
          }),
        }),
        expect.anything() // React legacy second arg (ref / context)
      );
    });
  });

  describe('plain EuiBadge branch', () => {
    it('renders an EuiBadge with the correct data-test-subj when no MenuItem is defined', async () => {
      const action = {
        id: 'plainBadge',
        isCompatible: jest.fn().mockResolvedValue(true),
        getDisplayName: jest.fn().mockReturnValue('Plain Badge'),
        getIconType: jest.fn().mockReturnValue(undefined),
        execute: jest.fn(),
      } as unknown as Action<EmbeddableApiContext>;

      render(<BadgeHost showBadges api={mockApi} getActions={makeGetActions([action])} />);

      await waitFor(() =>
        expect(screen.getByTestId('embeddablePanelBadge-plainBadge')).toBeInTheDocument()
      );

      // EuiBadge with an onClick renders as a <button>
      expect(screen.getByTestId('embeddablePanelBadge-plainBadge').tagName).toBe('BUTTON');
    });

    it('does not set a tooltip-derived aria-label on the EuiBadge when getDisplayNameTooltip is absent', async () => {
      const displayName = 'No Tooltip Badge';
      const action = {
        id: 'noTooltipBadge',
        isCompatible: jest.fn().mockResolvedValue(true),
        getDisplayName: jest.fn().mockReturnValue(displayName),
        getIconType: jest.fn().mockReturnValue(undefined),
        execute: jest.fn(),
      } as unknown as Action<EmbeddableApiContext>;

      render(<BadgeHost showBadges api={mockApi} getActions={makeGetActions([action])} />);

      await waitFor(() =>
        expect(screen.getByTestId('embeddablePanelBadge-noTooltipBadge')).toBeInTheDocument()
      );

      // EuiBadge sets aria-label from onClickAriaLabel (the display name) when clicked,
      // but must NOT carry a separate tooltip-text aria-label from the tooltip branch.
      expect(screen.getByTestId('embeddablePanelBadge-noTooltipBadge')).toHaveAttribute(
        'aria-label',
        displayName
      );
    });

    it('sets aria-label and wraps the badge in EuiToolTip when getDisplayNameTooltip returns text', async () => {
      const tooltipText = 'Badge tooltip description';
      const action = {
        id: 'tooltipBadge',
        isCompatible: jest.fn().mockResolvedValue(true),
        getDisplayName: jest.fn().mockReturnValue('Tooltip Badge'),
        getDisplayNameTooltip: jest.fn().mockReturnValue(tooltipText),
        getIconType: jest.fn().mockReturnValue(undefined),
        execute: jest.fn(),
      } as unknown as Action<EmbeddableApiContext>;

      render(<BadgeHost showBadges api={mockApi} getActions={makeGetActions([action])} />);

      await waitFor(() =>
        expect(screen.getByTestId('embeddablePanelBadge-tooltipBadge')).toBeInTheDocument()
      );

      // useBadges passes aria-label to EuiBadge when tooltip text is present
      expect(screen.getByTestId('embeddablePanelBadge-tooltipBadge')).toHaveAttribute(
        'aria-label',
        tooltipText
      );
    });
  });
});
