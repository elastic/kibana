/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import type { FC, ReactElement } from 'react';
import React, { useEffect, useState } from 'react';
import { EuiButtonIcon, EuiToolTip, type UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { v4 } from 'uuid';
import { Subscription, switchMap } from 'rxjs';

import type { ViewMode } from '@kbn/presentation-publishing';
import { apiHasUniqueId } from '@kbn/presentation-publishing';
import type { Action, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { AnyApiAction } from '@kbn/presentation-panel-plugin/public/panel_actions/types';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

export interface FloatingActionsProps {
  children: ReactElement;

  className?: string;
  isEnabled?: boolean;
  api?: unknown;
  uuid: string;
  viewMode?: ViewMode;
  disabledActions?: string[];
  uiActions: UiActionsStart;
}

export type FloatingActionItem = AnyApiAction & {
  MenuItem: React.FC<{ context: unknown }>;
};

const getFloatingActionItem = (uuid: string, action: Action, context: any): FloatingActionItem => ({
  ...action,
  MenuItem: () => (
    <EuiToolTip
      key={`control-action-${uuid}-${action.id}`}
      content={action.getDisplayNameTooltip?.(context) ?? action.getDisplayName(context)}
    >
      <EuiButtonIcon
        iconType={action.getIconType(context) ?? 'empty'}
        color="text"
        onClick={() => action.execute(context)}
      />
    </EuiToolTip>
  ),
});

export const FloatingActions: FC<FloatingActionsProps> = ({
  children,
  viewMode,
  isEnabled,
  api,
  uuid,
  className = '',
  disabledActions,
  uiActions,
}) => {
  const [floatingActions, setFloatingActions] = useState<FloatingActionItem[]>([]);

  useEffect(() => {
    if (!api) return;

    let canceled = false;
    const context = {
      embeddable: api,
      trigger: uiActions.getTrigger('CONTROL_HOVER_TRIGGER'),
    };

    const sortByOrder = (a: Action | FloatingActionItem, b: Action | FloatingActionItem) => {
      return (a.order || 0) - (b.order || 0);
    };

    const getActions: () => Promise<FloatingActionItem[]> = async () => {
      // return [];
      const actions = (
        await uiActions.getTriggerCompatibleActions('CONTROL_HOVER_TRIGGER', context)
      )
        .filter((action) => {
          return (disabledActions ?? []).indexOf(action.id) === -1;
        })
        .sort(sortByOrder)
        .map((action) => getFloatingActionItem(uuid, action, context));
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
          return [
            getFloatingActionItem(uuid, action, context) as FloatingActionItem,
            ...newActions,
          ];
        }
        return newActions;
      });
    };

    (async () => {
      const actions = await getActions();
      if (canceled) return;
      setFloatingActions(actions);

      const frequentlyChangingActions = await uiActions.getFrequentlyChangingActionsForTrigger(
        'CONTROL_HOVER_TRIGGER',
        context
      );
      await uiActions.getFrequentlyChangingActionsForTrigger('CONTROL_HOVER_TRIGGER', context);
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
  }, [api, uuid, viewMode, disabledActions, uiActions]);

  const styles = useMemoCss(floatingActionsStyles);

  return (
    <div css={styles.wrapper}>
      {children}
      {isEnabled && floatingActions.length > 0 && (
        <div
          data-test-subj={`presentationUtil__floatingActions__${
            apiHasUniqueId(api) ? api.uuid : v4()
          }`}
          className={classNames(
            'presentationUtil__floatingActions',
            `controlFrameFloatingActions`,
            className
          )}
          css={styles.floatingActions}
        >
          <>
            {floatingActions.map((action) =>
              React.createElement(action.MenuItem, {
                key: action.id,
                context: { embeddable: api },
              })
            )}
          </>
        </div>
      )}
    </div>
  );
};

const floatingActionsStyles = {
  wrapper: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'relative',
      '&:hover, &:focus-within': {
        '.presentationUtil__floatingActions': {
          opacity: 1,
          visibility: 'visible',
          transition: `visibility ${euiTheme.animation.fast}, opacity ${euiTheme.animation.fast}`,
        },
      },
    }),
  floatingActions: ({ euiTheme }: UseEuiTheme) =>
    css({
      opacity: 0,
      visibility: 'hidden',
      // slower transition on hover leave in case the user accidentally stops hover
      transition: `opacity ${euiTheme.animation.slow}`,
      position: 'absolute',
      right: euiTheme.size.xs,
      top: `-${euiTheme.size.l}`,
      zIndex: euiTheme.levels.toast,
      '&.controlFrameFloatingActions': {
        padding: euiTheme.size.xs,
        borderRadius: euiTheme.border.radius.medium,
        backgroundColor: euiTheme.colors.emptyShade,
        boxShadow: `0 0 0 1px ${euiTheme.colors.lightShade}`,
      },
    }),
};
