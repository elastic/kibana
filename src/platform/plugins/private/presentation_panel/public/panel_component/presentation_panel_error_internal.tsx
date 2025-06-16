/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonEmpty, EuiEmptyPrompt, EuiText } from '@elastic/eui';
import React, { useEffect, useMemo, useState } from 'react';

import { ErrorLike } from '@kbn/expressions-plugin/common';
import { EmbeddableApiContext, useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { renderSearchError } from '@kbn/search-errors';
import { Markdown } from '@kbn/shared-ux-markdown';
import { BehaviorSubject, Subscription, switchMap } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { useErrorTextStyle } from '@kbn/react-hooks';
import { ActionExecutionMeta } from '@kbn/ui-actions-plugin/public';
import { DefaultPresentationPanelApi } from './types';
import { uiActions } from '../kibana_services';
import { executeEditPanelAction } from '../panel_actions/edit_panel_action/execute_edit_action';
import { ACTION_EDIT_PANEL } from '../panel_actions/edit_panel_action/constants';
import { CONTEXT_MENU_TRIGGER } from '../panel_actions';

export interface PresentationPanelErrorProps {
  error: ErrorLike;
  api?: DefaultPresentationPanelApi;
}

export const PresentationPanelErrorInternal = ({ api, error }: PresentationPanelErrorProps) => {
  const errorTextStyle = useErrorTextStyle();

  const [isEditable, setIsEditable] = useState(false);
  const handleErrorClick = useMemo(
    () => (isEditable ? () => executeEditPanelAction(api) : undefined),
    [api, isEditable]
  );

  const [label, setLabel] = useState('');
  useEffect(() => {
    if (!isEditable) {
      setLabel('');
      return;
    }

    const canceled = false;
    uiActions
      .getAction(ACTION_EDIT_PANEL)
      .then((action) => {
        if (canceled) return;
        setLabel(
          action?.getDisplayName({
            embeddable: api,
            trigger: { id: CONTEXT_MENU_TRIGGER },
          } as EmbeddableApiContext & ActionExecutionMeta)
        );
      })
      .catch(() => {
        // ignore action not found
      });
  }, [api, isEditable]);

  const panelTitle = useStateFromPublishingSubject(api?.title$ ?? new BehaviorSubject(undefined));
  const ariaLabel = useMemo(
    () =>
      panelTitle
        ? i18n.translate('presentationPanel.error.editButton', {
            defaultMessage: 'Edit {value}',
            values: { value: panelTitle },
          })
        : label,
    [label, panelTitle]
  );

  // Get initial editable state from action and subscribe to changes.
  useEffect(() => {
    let canceled = false;
    const subscription = new Subscription();
    (async () => {
      const editPanelAction = await uiActions.getAction(ACTION_EDIT_PANEL);
      const context = {
        embeddable: api,
        trigger: { id: CONTEXT_MENU_TRIGGER },
      };
      if (canceled || !editPanelAction?.couldBecomeCompatible?.(context)) return;

      const initiallyCompatible = await editPanelAction?.isCompatible(context);
      if (canceled) return;
      setIsEditable(initiallyCompatible);
      const compatibilitySubscription = editPanelAction
        ?.getCompatibilityChangesSubject?.(context)
        ?.pipe(
          switchMap(async () => {
            return await editPanelAction.isCompatible(context);
          })
        )
        .subscribe(async (isCompatible) => {
          if (!canceled) setIsEditable(isCompatible);
        });
      subscription.add(compatibilitySubscription);
    })();

    return () => {
      canceled = true;
      subscription.unsubscribe();
    };
  }, [api]);

  const searchErrorDisplay = renderSearchError(error);

  const actions = searchErrorDisplay?.actions ?? [];
  if (isEditable) {
    actions.push(
      <EuiButtonEmpty aria-label={ariaLabel} onClick={handleErrorClick} size="s">
        {label}
      </EuiButtonEmpty>
    );
  }

  return (
    <EuiEmptyPrompt
      body={
        searchErrorDisplay?.body ?? (
          <EuiText size="s" css={errorTextStyle}>
            <Markdown data-test-subj="errorMessageMarkdown" readOnly>
              {error.message?.length
                ? error.message
                : i18n.translate('presentationPanel.emptyErrorMessage', {
                    defaultMessage: 'Error',
                  })}
            </Markdown>
          </EuiText>
        )
      }
      data-test-subj="embeddableStackError"
      iconType="warning"
      iconColor="danger"
      layout="vertical"
      actions={actions}
    />
  );
};
