/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { FC, ReactElement, useEffect, useState } from 'react';

import { IEmbeddable, panelHoverTrigger, PANEL_HOVER_TRIGGER } from '@kbn/embeddable-plugin/public';
import classNames from 'classnames';
import './floating_actions.scss';
import { pluginServices } from '../../services';

export interface FloatingActionsProps {
  embeddable?: IEmbeddable;
  className?: string;
  isEnabled?: boolean;
  children: ReactElement;
  disabledActions?: string[];
}

export const FloatingActions: FC<FloatingActionsProps> = ({
  embeddable,
  className = '',
  isEnabled,
  children,
  disabledActions,
}) => {
  const {
    uiActions: { getTriggerCompatibleActions },
  } = pluginServices.getServices();

  const [floatingActions, setFloatingActions] = useState<JSX.Element | undefined>(undefined);

  useEffect(() => {
    if (!embeddable) return;

    const getActions = async () => {
      const context = {
        embeddable,
        trigger: panelHoverTrigger,
      };
      const actions = (await getTriggerCompatibleActions(PANEL_HOVER_TRIGGER, context))
        .filter((action) => disabledActions?.indexOf(action.id) === -1)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      if (actions.length > 0) {
        setFloatingActions(
          <>
            {actions.map((action) =>
              action.MenuItem && embeddable
                ? React.createElement(action.MenuItem, {
                    key: action.id,
                    context,
                  })
                : undefined
            )}
          </>
        );
      } else {
        setFloatingActions(undefined);
      }
    };

    getActions();
  }, [embeddable, getTriggerCompatibleActions, isEnabled, disabledActions]);

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
