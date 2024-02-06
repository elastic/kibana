/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiMarkdownEditor, EuiMarkdownFormat } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import {
  ReactEmbeddableFactory,
  RegisterReactEmbeddable,
  registerReactEmbeddableFactory,
  useReactEmbeddableApiHandle,
  initializeReactEmbeddableUuid,
  initializeReactEmbeddableTitles,
  SerializedReactEmbeddableTitles,
  DefaultEmbeddableApi,
  useReactEmbeddableUnsavedChanges,
} from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { useInheritedViewMode, useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import React from 'react';
import { BehaviorSubject } from 'rxjs';

// -----------------------------------------------------------------------------
// Types for this embeddable
// -----------------------------------------------------------------------------
type MarkdownEditorSerializedState = SerializedReactEmbeddableTitles & {
  content: string;
};

type MarkdownEditorApi = DefaultEmbeddableApi;

const type = 'euiMarkdown';

// -----------------------------------------------------------------------------
// Define the Embeddable Factory
// -----------------------------------------------------------------------------
const markdownEmbeddableFactory: ReactEmbeddableFactory<
  MarkdownEditorSerializedState,
  MarkdownEditorApi
> = {
  // -----------------------------------------------------------------------------
  // Deserialize function
  // -----------------------------------------------------------------------------
  deserializeState: (state) => {
    // We could run migrations here.
    // We should inject references here. References are given as state.references

    return state.rawState as MarkdownEditorSerializedState;
  },

  // -----------------------------------------------------------------------------
  // Register the Embeddable component
  // -----------------------------------------------------------------------------
  getComponent: async (state, maybeId) => {
    /**
     * initialize state (source of truth)
     */
    const uuid = initializeReactEmbeddableUuid(maybeId);
    const { titlesApi, titleComparators, serializeTitles } = initializeReactEmbeddableTitles(state);
    const contentSubject = new BehaviorSubject(state.content);

    /**
     * getComponent is async so you can async import the component or load a saved object here.
     * the loading will be handed gracefully by the Presentation Container.
     */

    return RegisterReactEmbeddable((apiRef) => {
      /**
       * Unsaved changes logic is handled automatically by this hook. You only need to provide
       * a subject, setter, and optional state comparator for each key in your state type.
       */
      const { unsavedChanges, resetUnsavedChanges } = useReactEmbeddableUnsavedChanges(
        uuid,
        markdownEmbeddableFactory,
        {
          content: [contentSubject, (value) => contentSubject.next(value)],
          ...titleComparators,
        }
      );

      /**
       * Publish the API. This is what gets forwarded to the Actions framework, and to whatever the
       * parent of this embeddable is.
       */
      const thisApi = useReactEmbeddableApiHandle(
        {
          ...titlesApi,
          unsavedChanges,
          resetUnsavedChanges,
          serializeState: async () => {
            return {
              rawState: {
                ...serializeTitles(),
                content: contentSubject.getValue(),
              },
            };
          },
        },
        apiRef,
        uuid
      );

      // get state for rendering
      const content = useStateFromPublishingSubject(contentSubject);
      const viewMode = useInheritedViewMode(thisApi) ?? 'view';

      return viewMode === 'edit' ? (
        <EuiMarkdownEditor
          css={css`
            width: 100%;
          `}
          value={content ?? ''}
          onChange={(value) => contentSubject.next(value)}
          aria-label={i18n.translate('dashboard.test.markdownEditor.ariaLabel', {
            defaultMessage: 'Dashboard markdown editor',
          })}
          height="full"
        />
      ) : (
        <EuiMarkdownFormat
          css={css`
            padding: ${euiThemeVars.euiSizeS};
          `}
        >
          {content ?? ''}
        </EuiMarkdownFormat>
      );
    });
  },
};

// -----------------------------------------------------------------------------
// Register the defined Embeddable Factory - notice that this isn't defined
// on the plugin. Instead, it's a simple imported function. I.E to register an
// Embeddable, you only need the embeddable plugin in your requiredBundles
// -----------------------------------------------------------------------------
export const registerMarkdownEditorEmbeddable = () =>
  registerReactEmbeddableFactory(type, markdownEmbeddableFactory);
