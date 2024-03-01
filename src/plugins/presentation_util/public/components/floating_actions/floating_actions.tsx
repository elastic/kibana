/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import classNames from 'classnames';
import React, { FC, ReactElement, useEffect, useRef, useState } from 'react';
import useMount from 'react-use/lib/useMount';

import { EuiLoadingSpinner } from '@elastic/eui';
import {
  panelHoverTrigger,
  PANEL_HOVER_TRIGGER,
  type EmbeddableInput,
  type IEmbeddable,
  type ViewMode,
} from '@kbn/embeddable-plugin/public';
import { Action } from '@kbn/ui-actions-plugin/public';

import { pluginServices } from '../../services';
import './floating_actions.scss';

export interface FloatingActionsProps {
  children: ReactElement;

  className?: string;
  isEnabled?: boolean;
  embeddable?: IEmbeddable;
  viewMode?: ViewMode;
  disabledActions?: EmbeddableInput['disabledActions'];
}

export const FloatingActions: FC<FloatingActionsProps> = ({
  children,
  viewMode,
  isEnabled,
  embeddable,
  className = '',
  disabledActions,
}) => {
  const {
    uiActions: { getTriggerCompatibleActions },
  } = pluginServices.getServices();
  const isMounted = useRef(false);
  const [floatingActions, setFloatingActions] = useState<JSX.Element | undefined>(undefined);

  useMount(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  });

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

      if (!isMounted.current) return;

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
    <div
      className="presentationUtil__floatingActionsWrapper"
      data-test-subj={`presentationUtil__floatingActionsWrapper__${embeddable?.id}`}
    >
      {children}
      {isEnabled && embeddable && (
        <div
          className={classNames('presentationUtil__floatingActions', className)}
          data-test-subj={`presentationUtil__floatingActions__${embeddable.id}`}
        >
          {floatingActions ?? (
            <EuiLoadingSpinner data-test-subj="presentationUtil_loadingfloatingActions" size="s" />
          )}
        </div>
      )}
    </div>
  );
};
