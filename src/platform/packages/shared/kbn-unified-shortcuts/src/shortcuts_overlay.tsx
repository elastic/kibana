/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  type PropsWithChildren,
  type ReactNode,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPortal,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import useUnmount from 'react-use/lib/useUnmount';
import { consumeKeyboardEvent, hasModifierKey } from './shortcut_utils';
import { useShortcutsContext } from './shortcuts_provider';

/**
 * Ref methods for {@link ShortcutsOverlay}.
 */
export interface ShortcutsOverlayRef {
  open: () => boolean;
}

/**
 * Props for {@link ShortcutsOverlay}.
 */
export interface ShortcutsOverlayProps {
  items: ReactNode[];
  shouldOpen: (event: KeyboardEvent) => boolean;
  runAction: (event: KeyboardEvent) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

/**
 * Props for {@link ShortcutsOverlayItem}.
 */
export interface ShortcutsOverlayItemProps {
  badgeColor?: 'primary' | 'hollow';
  badgeLabel: string;
  description: string;
}

const getOverlayItemKey = (item: ReactNode, index: number) => {
  return isValidElement(item) && item.key != null ? item.key : index;
};

const ShortcutsOverlayFlexItem = ({ children }: PropsWithChildren) => {
  return (
    <EuiFlexItem
      grow={false}
      css={css`
        align-self: stretch;
        display: flex;
        align-items: center;
      `}
    >
      {children}
    </EuiFlexItem>
  );
};

/**
 * Renders the shared shortcuts overlay container and item layout.
 */
export const ShortcutsOverlay = forwardRef<ShortcutsOverlayRef, ShortcutsOverlayProps>(
  ({ items, shouldOpen, runAction, onOpen, onClose }, ref) => {
    const {
      claimActiveLeaderKeyInstance,
      hasOtherActiveLeaderKeyInstance,
      releaseActiveLeaderKeyInstance,
    } = useShortcutsContext();
    const { euiTheme } = useEuiTheme();
    const [isVisible, setIsVisible] = useState(false);
    const [instanceId] = useState(() => Symbol('shortcuts-overlay'));
    const open = useCallback(() => {
      if (isVisible) {
        return true;
      }

      if (hasOtherActiveLeaderKeyInstance(instanceId)) {
        return false;
      }

      claimActiveLeaderKeyInstance(instanceId);
      onOpen?.();
      setIsVisible(true);

      return true;
    }, [
      claimActiveLeaderKeyInstance,
      hasOtherActiveLeaderKeyInstance,
      instanceId,
      isVisible,
      onOpen,
    ]);
    const close = useCallback(() => {
      if (!isVisible) {
        return;
      }

      releaseActiveLeaderKeyInstance(instanceId);
      onClose?.();
      setIsVisible(false);
    }, [instanceId, isVisible, onClose, releaseActiveLeaderKeyInstance]);

    useImperativeHandle(ref, () => ({ open }), [open]);

    useEffect(() => {
      const onKeyDown = (event: KeyboardEvent) => {
        if (isVisible) {
          if (!hasModifierKey(event)) {
            consumeKeyboardEvent(event);
          }

          close();

          if (event.key !== 'Escape') {
            runAction(event);
          }
        } else if (!hasOtherActiveLeaderKeyInstance(instanceId) && shouldOpen(event) && open()) {
          consumeKeyboardEvent(event);
        }
      };

      const onPointerDown = () => {
        if (isVisible) {
          close();
        }
      };

      document.addEventListener('keydown', onKeyDown, true);
      document.addEventListener('pointerdown', onPointerDown, true);

      return () => {
        document.removeEventListener('keydown', onKeyDown, true);
        document.removeEventListener('pointerdown', onPointerDown, true);
      };
    }, [
      close,
      hasOtherActiveLeaderKeyInstance,
      instanceId,
      isVisible,
      open,
      runAction,
      shouldOpen,
    ]);

    useUnmount(() => {
      releaseActiveLeaderKeyInstance(instanceId);
    });

    return (
      <EuiPortal>
        <EuiPanel
          aria-hidden="true"
          paddingSize="m"
          css={css`
            position: fixed;
            right: ${euiTheme.size.l};
            bottom: ${euiTheme.size.l};
            z-index: ${euiTheme.levels.toast};
            pointer-events: none;
            max-width: calc(100vw - ${euiTheme.size.l} * 2);
            opacity: ${isVisible ? 1 : 0};
            transform: translateY(${isVisible ? '0' : euiTheme.size.s});
            transition: opacity ${euiTheme.animation.fast} ${euiTheme.animation.resistance},
              transform ${euiTheme.animation.fast} ${euiTheme.animation.resistance};
            will-change: opacity, transform;
          `}
        >
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
            {items.map((item, index) => (
              <ShortcutsOverlayFlexItem key={getOverlayItemKey(item, index)}>
                {item}
              </ShortcutsOverlayFlexItem>
            ))}

            {items.length > 0 && (
              <ShortcutsOverlayFlexItem>
                <ShortcutsOverlayDivider />
              </ShortcutsOverlayFlexItem>
            )}

            <ShortcutsOverlayFlexItem>
              <EuiBadge>
                {i18n.translate('unifiedShortcuts.shortcutsOverlay.escapeLabel', {
                  defaultMessage: 'esc',
                })}
              </EuiBadge>
            </ShortcutsOverlayFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiPortal>
    );
  }
);

ShortcutsOverlay.displayName = 'ShortcutsOverlay';

/**
 * Renders a badge-plus-description item within a shortcuts overlay.
 */
export const ShortcutsOverlayItem = ({
  badgeColor = 'hollow',
  badgeLabel,
  description,
}: ShortcutsOverlayItemProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap={false}>
      <EuiBadge color={badgeColor}>{badgeLabel}</EuiBadge>
      <EuiText
        size="xs"
        css={css`
          white-space: nowrap;
          font-weight: ${euiTheme.font.weight.medium};
        `}
      >
        {description}
      </EuiText>
    </EuiFlexGroup>
  );
};

/**
 * Renders a divider between items in a shortcuts overlay.
 */
export const ShortcutsOverlayDivider = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        width: ${euiTheme.border.width.thin};
        height: 100%;
        background-color: ${euiTheme.colors.borderBasePlain};
      `}
    />
  );
};
