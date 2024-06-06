/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import classNames from 'classnames';
import React, { FC, ReactElement, useEffect, useState } from 'react';
import { v4 } from 'uuid';

import {
  panelHoverTrigger,
  PANEL_HOVER_TRIGGER,
  type EmbeddableInput,
  type ViewMode,
} from '@kbn/embeddable-plugin/public';
import { apiHasUniqueId } from '@kbn/presentation-publishing';
import { Action } from '@kbn/ui-actions-plugin/public';

import { pluginServices } from '../../services';
import './floating_actions.scss';

export interface FloatingActionsProps {
  children: ReactElement;

  className?: string;
  isEnabled?: boolean;
  api?: unknown;
  viewMode?: ViewMode;
  disabledActions?: EmbeddableInput['disabledActions'];
}

export const FloatingActions: FC<FloatingActionsProps> = ({
  children,
  viewMode,
  isEnabled,
  api,
  className = '',
  disabledActions,
}) => {
  const {
    uiActions: { getTriggerCompatibleActions },
  } = pluginServices.getServices();
  const [floatingActions, setFloatingActions] = useState<JSX.Element | undefined>(undefined);

  useEffect(() => {
    if (!api) return;

    const getActions = async () => {
      let mounted = true;
      const context = {
        embeddable: api,
        trigger: panelHoverTrigger,
      };
      const actions = (await getTriggerCompatibleActions(PANEL_HOVER_TRIGGER, context))
        .filter((action): action is Action & { MenuItem: React.FC } => {
          return action.MenuItem !== undefined && (disabledActions ?? []).indexOf(action.id) === -1;
        })
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      if (!mounted) return;
      if (actions.length > 0) {
        setFloatingActions(
          <>
            {actions.map((action) =>
              React.createElement(action.MenuItem, {
                key: action.id,
                context,
              })
            )}
          </>
        );
      } else {
        setFloatingActions(undefined);
      }
      return () => {
        mounted = false;
      };
    };

    getActions();
  }, [api, getTriggerCompatibleActions, viewMode, disabledActions]);

  return (
    <div className="presentationUtil__floatingActionsWrapper">
      {children}
      {isEnabled && floatingActions && (
        <div
          data-test-subj={`presentationUtil__floatingActions__${
            apiHasUniqueId(api) ? api.uuid : v4()
          }`}
          className={classNames('presentationUtil__floatingActions', className)}
        >
          {floatingActions}
        </div>
      )}
    </div>
  );
};
