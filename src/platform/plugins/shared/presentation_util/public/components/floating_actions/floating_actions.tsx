/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import React, { FC, ReactElement, useEffect, useState } from 'react';
import { v4 } from 'uuid';
import { Subscription } from 'rxjs';

import {
  PANEL_HOVER_TRIGGER,
  panelHoverTrigger,
  type EmbeddableInput,
  type ViewMode,
} from '@kbn/embeddable-plugin/public';
import { apiHasUniqueId } from '@kbn/presentation-publishing';
import { Action } from '@kbn/ui-actions-plugin/public';
import { AnyApiAction } from '@kbn/presentation-panel-plugin/public/panel_actions/types';
import { uiActionsService } from '../../services/kibana_services';
import './floating_actions.scss';

export interface FloatingActionsProps {
  children: ReactElement;

  className?: string;
  isEnabled?: boolean;
  api?: unknown;
  viewMode?: ViewMode;
  disabledActions?: EmbeddableInput['disabledActions'];
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

    let mounted = true;
    const context = {
      embeddable: api,
      trigger: panelHoverTrigger,
    };

    const sortByOrder = (a: Action | FloatingActionItem, b: Action | FloatingActionItem) => {
      return (a.order || 0) - (b.order || 0);
    };

    const getActions: () => Promise<FloatingActionItem[]> = async () => {
      const actions = (
        await uiActionsService.getTriggerCompatibleActions(PANEL_HOVER_TRIGGER, context)
      )
        .filter((action) => {
          return action.MenuItem !== undefined && (disabledActions ?? []).indexOf(action.id) === -1;
        })
        .sort(sortByOrder);
      return actions as FloatingActionItem[];
    };

    const subscriptions = new Subscription();

    const handleActionCompatibilityChange = (isCompatible: boolean, action: Action) => {
      if (!mounted) return;
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
      if (!mounted) return;
      setFloatingActions(actions);

      const frequentlyChangingActions = uiActionsService.getFrequentlyChangingActionsForTrigger(
        PANEL_HOVER_TRIGGER,
        context
      );

      for (const action of frequentlyChangingActions) {
        subscriptions.add(
          action.subscribeToCompatibilityChanges(context, handleActionCompatibilityChange)
        );
      }
    })();

    return () => {
      mounted = false;
      subscriptions.unsubscribe();
    };
  }, [api, viewMode, disabledActions]);

  return (
    <div className="presentationUtil__floatingActionsWrapper">
      {children}
      {isEnabled && floatingActions.length > 0 && (
        <div
          data-test-subj={`presentationUtil__floatingActions__${
            apiHasUniqueId(api) ? api.uuid : v4()
          }`}
          className={classNames('presentationUtil__floatingActions', className)}
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
