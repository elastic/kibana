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
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  initializeTitleManager,
  useInheritedViewMode,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { EUI_MARKDOWN_ID } from './constants';
import {
  MarkdownEditorApi,
  MarkdownEditorRuntimeState,
  MarkdownEditorSerializedState,
} from './types';

export const markdownEmbeddableFactory: ReactEmbeddableFactory<
  MarkdownEditorSerializedState,
  MarkdownEditorRuntimeState,
  MarkdownEditorApi
> = {
  type: EUI_MARKDOWN_ID,
  deserializeState: (state) => state.rawState,
  /**
   * The buildEmbeddable function is async so you can async import the component or load a saved
   * object here. The loading will be handed gracefully by the Presentation Container.
   */
  buildEmbeddable: async (state, buildApi) => {
    /**
     * initialize state (source of truth)
     */
    const titleManager = initializeTitleManager(state);
    const content$ = new BehaviorSubject(state.content);

    /**
     * Register the API for this embeddable. This API will be published into the imperative handle
     * of the React component. Methods on this API will be exposed to siblings, to registered actions
     * and to the parent api.
     */
    const api = buildApi(
      {
        ...titleManager.api,
        serializeState: () => {
          return {
            rawState: {
              ...titleManager.serialize(),
              content: content$.getValue(),
            },
          };
        },
      },

      /**
       * Provide state comparators. Each comparator is 3 element tuple:
       * 1) current value (publishing subject)
       * 2) setter, allowing parent to reset value
       * 3) optional comparator which provides logic to diff lasted stored value and current value
       */
      {
        content: [content$, (value) => content$.next(value)],
        ...titleManager.comparators,
      }
    );

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
