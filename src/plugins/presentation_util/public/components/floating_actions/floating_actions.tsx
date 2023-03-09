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
}

export const FloatingActions: FC<FloatingActionsProps> = ({
  embeddable,
  className = '',
  isEnabled,
  children,
}) => {
  const {
    uiActions: { getTriggerCompatibleActions },
  } = pluginServices.getServices();

  const [floatingActions, setFloatingActions] = useState<JSX.Element>();

  useEffect(() => {
    if (!embeddable) return;

    const getActions = async () => {
      console.log('get actions');
      const context = {
        embeddable,
        trigger: panelHoverTrigger,
      };
      const actions = await getTriggerCompatibleActions(PANEL_HOVER_TRIGGER, context);
      if (actions.length > 0) {
        const components = actions.map((action) =>
          action.MenuItem && embeddable
            ? React.createElement(action.MenuItem, {
                key: action.id,
                context,
              })
            : undefined
        );
        setFloatingActions(<>{components}</>);
      } else {
        setFloatingActions(undefined);
      }
    };

    getActions();
  }, [embeddable, getTriggerCompatibleActions, isEnabled]);

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
