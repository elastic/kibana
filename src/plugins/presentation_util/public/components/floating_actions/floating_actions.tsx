/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { FC, ReactElement, useEffect, useState } from 'react';
import { TypedUseSelectorHook } from 'react-redux';
import classNames from 'classnames';

import { IEmbeddable, panelHoverTrigger, PANEL_HOVER_TRIGGER } from '@kbn/embeddable-plugin/public';
import { Action } from '@kbn/ui-actions-plugin/public';

import { pluginServices } from '../../services';
import './floating_actions.scss';
import { ReduxEmbeddableState } from '../../redux_embeddables';

export interface FloatingActionsProps {
  children: ReactElement;
  select: TypedUseSelectorHook<ReduxEmbeddableState>;

  className?: string;
  isEnabled?: boolean;
  embeddable?: IEmbeddable;
}

export const FloatingActions: FC<FloatingActionsProps> = ({
  select,
  children,
  isEnabled,
  embeddable,
  className = '',
}) => {
  const {
    uiActions: { getTriggerCompatibleActions },
  } = pluginServices.getServices();

  const viewMode = select((state) => state.explicitInput.viewMode);
  const disabledActions = select((state) => state.explicitInput.disabledActions);

  const [floatingActions, setFloatingActions] = useState<JSX.Element | undefined>(undefined);

  useEffect(() => {
    if (!embeddable) return;

    const getActions = async () => {
      const context = {
        embeddable,
        trigger: panelHoverTrigger,
      };
      const actions = (await getTriggerCompatibleActions(PANEL_HOVER_TRIGGER, context))
        .filter((action): action is Action & { MenuItem: React.FC } => {
          return action.MenuItem !== undefined && (disabledActions ?? []).indexOf(action.id) === -1;
        })
        .sort((a, b) => (a.order || 0) - (b.order || 0));
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
    };

    getActions();
  }, [embeddable, getTriggerCompatibleActions, viewMode, disabledActions]);

  return (
    <div className="presentationUtil__floatingActionsWrapper">
      {children}
      {isEnabled && floatingActions && (
        <div className={classNames('presentationUtil__floatingActions', className)}>
          {floatingActions}
        </div>
      )}
    </div>
  );
};
