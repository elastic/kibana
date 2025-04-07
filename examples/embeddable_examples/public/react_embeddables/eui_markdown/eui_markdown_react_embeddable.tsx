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
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import {
  StateComparators,
  WithAllKeys,
  getViewModeSubject,
  initializeStateManager,
  initializeTitleManager,
  titleComparators,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import React from 'react';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { EUI_MARKDOWN_ID } from './constants';
import { MarkdownEditorApi, MarkdownEditorSerializedState, MarkdownEditorState } from './types';

const defaultMarkdownState: WithAllKeys<MarkdownEditorState> = {
  content: '',
};

const markdownComparators: StateComparators<MarkdownEditorState> = { content: 'referenceEquality' };

export const markdownEmbeddableFactory: EmbeddableFactory<
  MarkdownEditorSerializedState,
  MarkdownEditorApi
> = {
  type: EUI_MARKDOWN_ID,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    /**
     * Initialize state managers.
     */
    const initialMarkdownState = initialState.rawState;
    const titleManager = initializeTitleManager(initialMarkdownState);
    const markdownStateManager = initializeStateManager(initialMarkdownState, defaultMarkdownState);

    /**
     * if this embeddable had a difference between its runtime and serialized state, we could define and run a
     * "deserializeState" function here. If this embeddable could be by reference, we could load the saved object
     * in the deserializeState function.
     */

    const serializeMarkdown = (): MarkdownEditorSerializedState => ({
      ...titleManager.getLatestState(),
      ...markdownStateManager.getLatestState(),
    });

    const unsavedChangesApi = initializeUnsavedChanges({
      uuid,
      parentApi,
      serializeState: serializeMarkdown,
      latestRuntimeState$: combineLatest([
        titleManager.latestState$,
        markdownStateManager.latestState$,
      ]),
      getComparators: () => {
        /**
         * comparators are provided in a callback to allow embeddables to change how their state is compared based
         * on the values of other state. For instance, if a saved object ID is present (by reference), the embeddable
         * may want to skip comparison of certain state.
         */
        return { ...titleComparators, ...markdownComparators };
      },
      onReset: (lastSaved) => {
        /**
         * if this embeddable had a difference between its runtime and serialized state, we could run the 'deserializeState'
         * function here before resetting. onReset can be async so to support a potential async deserialize function.
         */

        titleManager.reinitializeState(lastSaved);
        markdownStateManager.reinitializeState(lastSaved);
      },
    });

    const api = finalizeApi({
      ...unsavedChangesApi,
      ...titleManager.api,
      serializeState: () => ({
        rawState: serializeMarkdown(),
        // references: if this embeddable had any references - this is where we would extract them.
      }),
    });

    return {
      api,
      Component: () => {
        // get state for rendering
        const content = useStateFromPublishingSubject(markdownStateManager.api.content$);
        const viewMode = useStateFromPublishingSubject(
          getViewModeSubject(api) ?? new BehaviorSubject('view')
        );
        const { euiTheme } = useEuiTheme();

        return viewMode === 'edit' ? (
          <EuiMarkdownEditor
            css={css`
              width: 100%;
            `}
            value={content ?? ''}
            onChange={(value) => markdownStateManager.api.setContent(value)}
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