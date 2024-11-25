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

import {
  PANEL_HOVER_TRIGGER,
  panelHoverTrigger,
  type EmbeddableInput,
  type ViewMode,
} from '@kbn/embeddable-plugin/public';
import { apiHasUniqueId } from '@kbn/presentation-publishing';
import { Action } from '@kbn/ui-actions-plugin/public';

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

export const FloatingActions: FC<FloatingActionsProps> = ({
  children,
  viewMode,
  isEnabled,
  api,
  className = '',
  disabledActions,
}) => {
  const [floatingActions, setFloatingActions] = useState<JSX.Element | undefined>(undefined);

  useEffect(() => {
    if (!api) return;

    const getActions = async () => {
      let mounted = true;
      const context = {
        embeddable: api,
        trigger: panelHoverTrigger,
      };
      const actions = (
        await uiActionsService.getTriggerCompatibleActions(PANEL_HOVER_TRIGGER, context)
      )
        .filter((action): action is Action & { MenuItem: React.FC<{ context: unknown }> } => {
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
  }, [api, viewMode, disabledActions]);

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
