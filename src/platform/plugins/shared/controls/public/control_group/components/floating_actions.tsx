/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import React, { FC, ReactElement, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { type UseEuiTheme, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { v4 } from 'uuid';
import { Subscription, switchMap } from 'rxjs';

import { ViewMode, apiHasUniqueId } from '@kbn/presentation-publishing';
import { Action } from '@kbn/ui-actions-plugin/public';
import { AnyApiAction } from '@kbn/presentation-panel-plugin/public/panel_actions/types';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { uiActionsService } from '../../services/kibana_services';
import { CONTROL_HOVER_TRIGGER, controlHoverTrigger } from '../../actions/controls_hover_trigger';

export interface FloatingActionsProps {
  children: ReactElement;

  className?: string;
  isEnabled?: boolean;
  api?: unknown;
  viewMode?: ViewMode;
  disabledActions?: string[];
  isTwoLine?: boolean;
}

export type FloatingActionItem = AnyApiAction & {
  MenuItem: React.FC<{ context: unknown }>;
};

export const FloatingActions: FC<FloatingActionsProps> = ({
  children,
  viewMode,
  isEnabled,
  api,
  className = '',
  disabledActions,
  isTwoLine,
}) => {
  const [floatingActions, setFloatingActions] = useState<FloatingActionItem[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [portalPosition, setPortalPosition] = useState<{ top: number; left: number } | null>(null);

  const { euiTheme } = useEuiTheme();

  useEffect(() => {
    if (!api) return;

    let canceled = false;
    const context = {
      embeddable: api,
      trigger: controlHoverTrigger,
    };

    const sortByOrder = (a: Action | FloatingActionItem, b: Action | FloatingActionItem) => {
      return (a.order || 0) - (b.order || 0);
    };

    const getActions: () => Promise<FloatingActionItem[]> = async () => {
      const actions = (
        await uiActionsService.getTriggerCompatibleActions(CONTROL_HOVER_TRIGGER, context)
      )
        .filter((action) => {
          return action.MenuItem !== undefined && (disabledActions ?? []).indexOf(action.id) === -1;
        })
        .sort(sortByOrder);
      return actions as FloatingActionItem[];
    };

    const subscriptions = new Subscription();

    const handleActionCompatibilityChange = (isCompatible: boolean, action: Action) => {
      if (canceled) return;
      setFloatingActions((currentActions) => {
        const newActions: FloatingActionItem[] = currentActions
          ?.filter((current) => current.id !== action.id)
          .sort(sortByOrder) as FloatingActionItem[];
        if (isCompatible) {
          return [action as FloatingActionItem, ...newActions];
        }
        return newActions;
      });
    };

    (async () => {
      const actions = await getActions();
      if (canceled) return;
      setFloatingActions(actions);

      const frequentlyChangingActions =
        await uiActionsService.getFrequentlyChangingActionsForTrigger(
          CONTROL_HOVER_TRIGGER,
          context
        );
      if (canceled) return;

      for (const action of frequentlyChangingActions) {
        const compatibilitySubscription = action
          .getCompatibilityChangesSubject(context)
          ?.pipe(
            switchMap(async () => {
              return await action.isCompatible(context);
            })
          )
          .subscribe(async (isCompatible) => {
            handleActionCompatibilityChange(isCompatible, action);
          });
        subscriptions.add(compatibilitySubscription);
      }
    })();

    return () => {
      canceled = true;
      subscriptions.unsubscribe();
    };
  }, [api, viewMode, disabledActions]);

  const updatePortalPosition = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const offset = Number(euiTheme.size.l.replace('px', ''));
      setPortalPosition({
        top: rect.top - offset, // Offset for floating actions height
        left: rect.right - offset, // Align to right side with small offset
      });
    }
  };

  const styles = useMemoCss(floatingActionsStyles);

  const FloatingActionsPortal = () => {
    if (!isEnabled || floatingActions.length === 0 || !portalPosition) return null;

    return createPortal(
      <div
        data-test-subj={`presentationUtil__floatingActions__${
          apiHasUniqueId(api) ? api.uuid : v4()
        }`}
        className={classNames(
          'presentationUtil__floatingActions',
          `controlFrameFloatingActions--${isTwoLine ? 'twoLine' : 'oneLine'}`,
          className
        )}
        css={styles.floatingActionsPortal}
        style={{
          top: portalPosition.top,
          left: portalPosition.left,
        }}
      >
        <>
          {floatingActions.map((action) =>
            React.createElement(action.MenuItem, {
              key: action.id,
              context: { embeddable: api },
            })
          )}
        </>
      </div>,
      document.body
    );
  };

  return (
    <div
      css={styles.wrapper}
      ref={wrapperRef}
      onMouseEnter={updatePortalPosition}
      onMouseLeave={() => setPortalPosition(null)}
    >
      {children}
      <FloatingActionsPortal />
    </div>
  );
};

const floatingActionsStyles = {
  wrapper: () =>
    css({
      position: 'relative',
    }),
  floatingActionsPortal: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'fixed',
      zIndex: euiTheme.levels.toast,
      opacity: 1,
      visibility: 'visible',
      transition: `opacity ${euiTheme.animation.fast}`,
      minWidth: 'max-content',
      pointerEvents: 'auto',
      '&.controlFrameFloatingActions--oneLine': {
        padding: euiTheme.size.xs,
        borderRadius: euiTheme.border.radius.medium,
        backgroundColor: euiTheme.colors.emptyShade,
        boxShadow: `0 0 0 1px ${euiTheme.colors.lightShade}`,
      },
      '&.controlFrameFloatingActions--twoLine': {
        top: `-${euiTheme.size.xs} !important`,
      },
    }),
};
