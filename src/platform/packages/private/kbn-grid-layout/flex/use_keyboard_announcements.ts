/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';

import type { FlexKeyboardInteraction, FlexLayoutStateManager } from './types';
import { getLayoutInOrder } from './utils/resolve_grid_section';

/** Describes the keyboard drag interaction; set as the `aria-description` of every drag handle */
export const getKeyboardDragInstructions = (): string =>
  i18n.translate('kbnGridLayout.flex.keyboardDrag.instructions', {
    defaultMessage:
      'Press Space or Enter to pick up this panel, then use the arrow keys to move it. Press Space or Enter again to drop it, or Escape to cancel.',
  });

const getPosition = (
  { gridLayout$ }: FlexLayoutStateManager,
  panelId: string
): { position: number; total: number } => {
  const panelsInOrder = getLayoutInOrder(gridLayout$.getValue());
  return {
    position: panelsInOrder.findIndex(({ id }) => id === panelId) + 1,
    total: panelsInOrder.length,
  };
};

const getMessage = (
  type: FlexKeyboardInteraction['type'],
  label: string,
  position: number,
  total: number
): string => {
  switch (type) {
    case 'start':
      return i18n.translate('kbnGridLayout.flex.keyboardDrag.started', {
        defaultMessage:
          '{label} picked up, position {position} of {total}. Use the arrow keys to move, Space or Enter to drop, or Escape to cancel.',
        values: { label, position, total },
      });
    case 'move':
      return i18n.translate('kbnGridLayout.flex.keyboardDrag.moved', {
        defaultMessage: '{label} moved to position {position} of {total}.',
        values: { label, position, total },
      });
    case 'end':
      return i18n.translate('kbnGridLayout.flex.keyboardDrag.dropped', {
        defaultMessage: '{label} dropped at position {position} of {total}.',
        values: { label, position, total },
      });
    case 'cancel':
      return i18n.translate('kbnGridLayout.flex.keyboardDrag.cancelled', {
        defaultMessage: 'Move cancelled. {label} returned to position {position} of {total}.',
        values: { label, position, total },
      });
  }
};

/**
 * Turns the steps of a keyboard drag into messages for a live region, since the only visual
 * feedback of a keyboard drag is the panel moving.
 */
export const useKeyboardAnnouncements = (
  gridLayoutStateManager: FlexLayoutStateManager
): string => {
  const [message, setMessage] = useState('');

  useEffect(() => {
    let lastPosition: number | undefined;
    const subscription = gridLayoutStateManager.keyboardInteraction$.subscribe(
      ({ type, panelId }) => {
        const { position, total } = getPosition(gridLayoutStateManager, panelId);
        // moving against the edge of the layout doesn't change anything, so there is nothing to say
        if (type === 'move' && position === lastPosition) return;
        lastPosition = type === 'start' || type === 'move' ? position : undefined;

        const label = i18n.translate('kbnGridLayout.flex.keyboardDrag.defaultLabel', {
          defaultMessage: 'Panel',
        });
        setMessage(getMessage(type, label, position, total));
      }
    );
    return () => subscription.unsubscribe();
  }, [gridLayoutStateManager]);

  return message;
};
