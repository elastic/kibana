/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import React, { FC, ReactElement, useEffect, useMemo, useState } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { v4 } from 'uuid';
import { Subscription, switchMap } from 'rxjs';

import { ViewMode, apiHasUniqueId } from '@kbn/presentation-publishing';
import { Action } from '@kbn/ui-actions-plugin/public';
import { AnyApiAction } from '@kbn/presentation-panel-plugin/public/panel_actions/types';
import { uiActionsService } from '../../services/kibana_services';
import { CONTROL_HOVER_TRIGGER, controlHoverTrigger } from '../../actions/controls_hover_trigger';

export interface FloatingActionsProps {
  children: ReactElement;

  className?: string;
  isEnabled?: boolean;
  api?: unknown;
  viewMode?: ViewMode;
  disabledActions?: string[];
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
}) => {
  const [floatingActions, setFloatingActions] = useState<FloatingActionItem[]>([]);

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

  const { wrapperStyles, floatingActionsStyles } = useStyles();

  return (
    <div css={wrapperStyles}>
      {children}
      {isEnabled && floatingActions.length > 0 && (
        <div
          data-test-subj={`presentationUtil__floatingActions__${
            apiHasUniqueId(api) ? api.uuid : v4()
          }`}
          className={classNames('presentationUtil__floatingActions', className)}
          css={floatingActionsStyles}
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

const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  const styles = useMemo(() => {
    return {
      wrapperStyles: css({
        position: 'relative',
        '&:hover, &:focus-within': {
          '.presentationUtil__floatingActions': {
            opacity: 1,
            visibility: 'visible',
            transition: `visibility ${euiTheme.animation.fast}, opacity ${euiTheme.animation.fast}`,
          },
        },
      }),
      floatingActionsStyles: css({
        opacity: 0,
        visibility: 'hidden',
        // slower transition on hover leave in case the user accidentally stops hover
        transition: `opacity ${euiTheme.animation.slow}`,
        position: 'absolute',
        right: euiTheme.size.xs,
        top: `-${euiTheme.size.l}`,
        zIndex: euiTheme.levels.toast,
      }),
    };
  }, [euiTheme]);
  return styles;
};
