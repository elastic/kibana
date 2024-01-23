/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButtonEmpty, EuiEmptyPrompt, EuiText } from '@elastic/eui';
import React, { useEffect, useMemo, useState } from 'react';

import { ErrorLike } from '@kbn/expressions-plugin/common';
import { Markdown } from '@kbn/kibana-react-plugin/public';
import { renderSearchError } from '@kbn/search-errors';

import { usePanelTitle } from '@kbn/presentation-publishing';
import { Subscription } from 'rxjs';
import { editPanelAction } from '../panel_actions/panel_actions';
import { getErrorCallToAction } from './presentation_panel_strings';
import { DefaultPresentationPanelApi } from './types';

export const PresentationPanelError = ({
  api,
  error,
}: {
  error: ErrorLike;
  api?: DefaultPresentationPanelApi;
}) => {
  const [isEditable, setIsEditable] = useState(false);
  const handleErrorClick = useMemo(
    () => (isEditable ? () => editPanelAction?.execute({ embeddable: api }) : undefined),
    [api, isEditable]
  );
  const label = useMemo(
    () => (isEditable ? editPanelAction?.getDisplayName({ embeddable: api }) : ''),
    [api, isEditable]
  );

  const panelTitle = usePanelTitle(api);
  const ariaLabel = useMemo(
    () => (panelTitle ? getErrorCallToAction(panelTitle) : label),
    [label, panelTitle]
  );

  // Get initial editable state from action and subscribe to changes.
  useEffect(() => {
    if (!editPanelAction?.couldBecomeCompatible({ embeddable: api })) return;

    let canceled = false;
    const subscription = new Subscription();
    (async () => {
      const initiallyCompatible = await editPanelAction?.isCompatible({ embeddable: api });
      if (canceled) return;
      setIsEditable(initiallyCompatible);

      subscription.add(
        editPanelAction?.subscribeToCompatibilityChanges({ embeddable: api }, (isCompatible) => {
          if (!canceled) setIsEditable(isCompatible);
        })
      );
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
          <EuiText size="s">
            <Markdown
              markdown={error.message}
              openLinksInNewTab={true}
              data-test-subj="errorMessageMarkdown"
            />
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
