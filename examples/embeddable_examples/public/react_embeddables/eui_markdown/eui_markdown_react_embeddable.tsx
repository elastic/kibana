/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiMarkdownEditor, EuiMarkdownFormat, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { apiHasLastSavedChildState } from '@kbn/presentation-containers';
import {
  SerializedPanelState,
  StateComparators,
  defaultTitlesState,
  initializeTitleManager,
  useInheritedViewMode,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import { areComparatorsEqual } from '@kbn/presentation-publishing/state_manager/state_comparators';
import React from 'react';
import { BehaviorSubject, combineLatest, combineLatestWith, map, of } from 'rxjs';
import { EUI_MARKDOWN_ID } from './constants';
import { MarkdownEditorApi, MarkdownEditorSerializedState } from './types';

// SERIALIZED STATE ONLY TODO remove this after state manager is created.
type WithAllKeys<T extends object> = { [Key in keyof Required<T>]: T[Key] };

const defaultMarkdownState: WithAllKeys<MarkdownEditorSerializedState> = {
  content: '',
  ...defaultTitlesState,
};

export const markdownEmbeddableFactory: EmbeddableFactory<
  MarkdownEditorSerializedState,
  MarkdownEditorApi
> = {
  type: EUI_MARKDOWN_ID,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const initialMarkdownState: MarkdownEditorSerializedState = {
      ...defaultMarkdownState,
      ...(initialState?.rawState ?? {}),
    };

    // A messy initial version of the state manager
    const titleManager = initializeTitleManager(initialMarkdownState);
    const content$ = new BehaviorSubject(initialMarkdownState.content);

    const allComparators: StateComparators<MarkdownEditorSerializedState> = {
      content: 'referenceEquality',
      ...titleManager.comparators,
    };

    const serializeState = (): SerializedPanelState<MarkdownEditorSerializedState> => ({
      rawState: {
        ...titleManager.serialize(),
        content: content$.getValue(),
      },
    });

    // A messy initial version of the serialized state unsaved changes logic
    const latestSerialziedState$ = combineLatest([
      content$,
      titleManager.api.title$,
      titleManager.api.description$,
      titleManager.api.hideTitle$,
    ]).pipe(map(() => serializeState()));
    const hasUnsavedChanges$ = apiHasLastSavedChildState<MarkdownEditorSerializedState>(parentApi)
      ? parentApi.lastSavedStateForChild$(uuid).pipe(
          combineLatestWith(latestSerialziedState$),
          map(([lastSaved, latest]) => {
            return !areComparatorsEqual(allComparators, lastSaved?.rawState, latest.rawState);
          })
        )
      : of(false);

    // a messy initial version of the 'reset' 'logic.
    const resetUnsavedChanges = () => {
      if (!apiHasLastSavedChildState<MarkdownEditorSerializedState>(parentApi)) return;
      const lastSavedState = parentApi.getLastSavedStateForChild(uuid);
      if (!lastSavedState) return;
      content$.next(lastSavedState.rawState.content);

      // SERIALIZED STATE ONLY TODO give the titleManager its own reset function...
      titleManager.api.setTitle(lastSavedState.rawState.title);
      titleManager.api.setDescription(lastSavedState.rawState.description);
      titleManager.api.setHideTitle(lastSavedState.rawState.hidePanelTitles);
    };

    const api = finalizeApi({
      ...titleManager.api,
      hasUnsavedChanges$,
      resetUnsavedChanges,
      serializeState,
    });

    return {
      api,
      Component: () => {
        // get state for rendering
        const content = useStateFromPublishingSubject(content$);
        const viewMode = useInheritedViewMode(api) ?? 'view';
        const { euiTheme } = useEuiTheme();

        return viewMode === 'edit' ? (
          <EuiMarkdownEditor
            css={css`
              width: 100%;
            `}
            value={content ?? ''}
            onChange={(value) => content$.next(value)}
            aria-label={i18n.translate('embeddableExamples.euiMarkdownEditor.embeddableAriaLabel', {
              defaultMessage: 'Dashboard markdown editor',
            })}
            height="full"
          />
        ) : (
          <EuiMarkdownFormat
            css={css`
              padding: ${euiTheme.size.m};
            `}
          >
            {content ?? ''}
          </EuiMarkdownFormat>
        );
      },
    };
  },
};
