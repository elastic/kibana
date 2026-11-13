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

/** Describes the keyboard resize interaction; set as the `aria-description` of every resize handle */
export const getKeyboardResizeInstructions = (): string =>
  i18n.translate('kbnGridLayout.flex.keyboardResize.instructions', {
    defaultMessage:
      'Press Space or Enter to start resizing this panel, then use the left and right arrow keys to change its width. Press Space or Enter again to apply the new width, or Escape to cancel.',
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

const getWidth = ({ gridLayout$ }: FlexLayoutStateManager, panelId: string): number =>
  Math.round(gridLayout$.getValue()[panelId]?.width ?? 0);

const getDragMessage = (
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

const getResizeMessage = (
  type: FlexKeyboardInteraction['type'],
  label: string,
  width: number
): string => {
  switch (type) {
    case 'start':
      return i18n.translate('kbnGridLayout.flex.keyboardResize.started', {
        defaultMessage:
          'Resizing {label}, width {width} pixels. Use the left and right arrow keys to change the width, Space or Enter to apply it, or Escape to cancel.',
        values: { label, width },
      });
    case 'move':
      return i18n.translate('kbnGridLayout.flex.keyboardResize.moved', {
        defaultMessage: '{label} width {width} pixels.',
        values: { label, width },
      });
    case 'end':
      return i18n.translate('kbnGridLayout.flex.keyboardResize.applied', {
        defaultMessage: 'Resize applied. {label} width {width} pixels.',
        values: { label, width },
      });
    case 'cancel':
      return i18n.translate('kbnGridLayout.flex.keyboardResize.cancelled', {
        defaultMessage: 'Resize cancelled. {label} width returned to {width} pixels.',
        values: { label, width },
      });
  }
};

/**
 * Turns the steps of a keyboard drag or resize into messages for a live region, since the only
 * visual feedback of these interactions is the panel moving or changing size.
 */
export const useKeyboardAnnouncements = (
  gridLayoutStateManager: FlexLayoutStateManager
): string => {
  const [message, setMessage] = useState('');

  useEffect(() => {
    let lastValue: number | undefined;
    const subscription = gridLayoutStateManager.keyboardInteraction$.subscribe(
      ({ type, interactionType, panelId }) => {
        const label = i18n.translate('kbnGridLayout.flex.keyboardDrag.defaultLabel', {
          defaultMessage: 'Panel',
        });
        const isResize = interactionType === 'resize';
        const { position, total } = getPosition(gridLayoutStateManager, panelId);
        const value = isResize ? getWidth(gridLayoutStateManager, panelId) : position;

        // moving against a limit (the edge of the layout, or the min/max width) doesn't change anything, so there is nothing to say
        if (type === 'move' && value === lastValue) return;
        lastValue = type === 'start' || type === 'move' ? value : undefined;

        setMessage(
          isResize
            ? getResizeMessage(type, label, value)
            : getDragMessage(type, label, position, total)
        );
      }
    );
    return () => subscription.unsubscribe();
  }, [gridLayoutStateManager]);

  return message;
};
