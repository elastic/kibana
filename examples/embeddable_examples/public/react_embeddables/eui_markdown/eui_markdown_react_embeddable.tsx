/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiLink, getDefaultEuiMarkdownPlugins } from '@elastic/eui';
import { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  apiCanAddNewPanel,
  apiCanFocusPanel,
  apiIsPresentationContainer,
  initializeUnsavedChanges,
} from '@kbn/presentation-containers';
import {
  StateComparators,
  WithAllKeys,
  getViewModeSubject,
  initializeStateManager,
  initializeTitleManager,
  titleComparators,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import React from 'react';
import { BehaviorSubject, map, merge } from 'rxjs';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { EUI_MARKDOWN_ID } from './constants';
import { MarkdownEditorApi, MarkdownEditorSerializedState, MarkdownEditorState } from './types';
import { MarkdownRenderer } from './components/markdown_renderer';
import { MarkdownEditor } from './components/markdown_editor';
import { MarkdownEditorPreviewSwitch } from './components/markdown_editor_preview_switch';

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
    const titleManager = initializeTitleManager(initialState.rawState);
    const markdownStateManager = initializeStateManager(
      initialState.rawState,
      defaultMarkdownState
    );
    const isEditing$ = new BehaviorSubject<boolean>(false);
    const isNewPanel$ = new BehaviorSubject<boolean>(false);
    const isPreview$ = new BehaviorSubject<boolean>(false);

    const overrideHoverActions$ = new BehaviorSubject<boolean>(false);

    /**
     * if this embeddable had a difference between its runtime and serialized state, we could define and run a
     * "deserializeState" function here. If this embeddable could be by reference, we could load the saved object
     * in the deserializeState function.
     */

    function serializeState() {
      return {
        rawState: {
          ...titleManager.getLatestState(),
          ...markdownStateManager.getLatestState(),
        },
        // references: if this embeddable had any references - this is where we would extract them.
      };
    }

    const unsavedChangesApi = initializeUnsavedChanges({
      uuid,
      parentApi,
      serializeState,
      anyStateChange$: merge(
        titleManager.anyStateChange$,
        markdownStateManager.anyStateChange$
      ).pipe(map(() => undefined)),
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

        titleManager.reinitializeState(lastSaved?.rawState);
        markdownStateManager.reinitializeState(lastSaved?.rawState);
      },
    });

    const api = finalizeApi({
      ...unsavedChangesApi,
      ...titleManager.api,
      serializeState,
      onEdit: async ({ isNewPanel = false } = {}) => {
        overrideHoverActions$.next(true);
        if (!apiCanAddNewPanel(parentApi)) throw new IncompatibleActionError();
        if (isNewPanel !== isNewPanel$.getValue()) {
          isNewPanel$.next(isNewPanel);
        }
        isEditing$.next(true);
        if (apiCanFocusPanel(parentApi)) {
          parentApi.setFocusedPanelId(api.uuid, false);
        }
      },
      isEditingEnabled: () => true,
      getTypeDisplayName: () => 'Markdown',
      overrideHoverActions$,
      OverriddenHoverActionsComponent: () => (
        <MarkdownEditorPreviewSwitch isPreview$={isPreview$} />
      ),
    });

    return {
      api,
      Component: () => {
        // get state for rendering
        const [content, isEditing, viewMode] = useBatchedPublishingSubjects(
          markdownStateManager.api.content$,
          isEditing$,
          getViewModeSubject(api) ?? new BehaviorSubject('view')
        );
        const excludingPlugins = Array<'lineBreaks' | 'linkValidator' | 'tooltip'>();
        const { processingPlugins: processingPluginList } = getDefaultEuiMarkdownPlugins({
          exclude: excludingPlugins,
        });

        // TODO: should we give user the option to openLinksInNewTab or not?
        // openLinksInNewTab functionality from https://codesandbox.io/s/relaxed-yalow-hy69r4?file=/demo.js:482-645
        processingPluginList[1][1].components.a = (props) => <EuiLink {...props} target="_blank" />;

        if (viewMode === 'view' || !isEditing) {
          return (
            <MarkdownRenderer processingPluginList={processingPluginList} content={content ?? ''} />
          );
        }

        const resetEditingState = () => {
          isEditing$.next(false);
          isPreview$.next(false);
          if (apiCanFocusPanel(parentApi)) {
            parentApi.setFocusedPanelId();
          }
          overrideHoverActions$.next(false);
        };

        return (
          <MarkdownEditor
            processingPluginList={processingPluginList}
            content={content ?? ''}
            onCancel={() => {
              if (isNewPanel$.getValue() && apiIsPresentationContainer(parentApi)) {
                parentApi.removePanel(api.uuid);
              }
              resetEditingState();
            }}
            onSave={(value: string) => {
              markdownStateManager.api.setContent(value);
              if (isNewPanel$.getValue()) {
                isNewPanel$.next(false);
              }
              resetEditingState();
            }}
            isPreview$={isPreview$}
          />
        );
      },
    };
  },
};
