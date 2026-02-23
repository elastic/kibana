/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiLink, getDefaultEuiMarkdownPlugins } from '@elastic/eui';
import { css } from '@emotion/react';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import type { StateComparators, WithAllKeys } from '@kbn/presentation-publishing';
import {
  apiCanAddNewPanel,
  apiCanFocusPanel,
  apiIsPresentationContainer,
  initializeUnsavedChanges,
  getViewModeSubject,
  initializeStateManager,
  initializeTitleManager,
  titleComparators,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import React from 'react';
import { BehaviorSubject, map, merge } from 'rxjs';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { MarkdownEditorState, MarkdownEmbeddableState } from '../server';
import { MARKDOWN_EMBEDDABLE_TYPE } from '../common/constants';
import type { MarkdownEditorApi } from './types';
import { MarkdownEditor } from './components/markdown_editor';
import { MarkdownEditorPreviewSwitch } from './components/markdown_editor_preview_switch';
import { MarkdownRenderer } from './components/markdown_renderer';

const defaultMarkdownState: WithAllKeys<MarkdownEditorState> = {
  content: '',
};

const flexCss = css({
  display: 'flex',
  flex: '1 1 100%',
});

const markdownComparators: StateComparators<MarkdownEditorState> = { content: 'referenceEquality' };

export const markdownEmbeddableFactory: EmbeddableFactory<
  MarkdownEmbeddableState,
  MarkdownEditorApi
> = {
  type: MARKDOWN_EMBEDDABLE_TYPE,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const titleManager = initializeTitleManager(initialState);
    const markdownStateManager = initializeStateManager(initialState, defaultMarkdownState);
    const isEditing$ = new BehaviorSubject<boolean>(false);
    const isNewPanel$ = new BehaviorSubject<boolean>(false);
    const isPreview$ = new BehaviorSubject<boolean>(false);

    const overrideHoverActions$ = new BehaviorSubject<boolean>(false);

    const serializeState = () => ({
      ...titleManager.getLatestState(),
      ...markdownStateManager.getLatestState(),
    });

    const resetEditingState = () => {
      isEditing$.next(false);
      overrideHoverActions$.next(false);
      isPreview$.next(false);
      if (apiCanFocusPanel(parentApi)) {
        parentApi.setFocusedPanelId();
      }
    };

    const unsavedChangesApi = initializeUnsavedChanges({
      uuid,
      parentApi,
      serializeState,
      anyStateChange$: merge(
        titleManager.anyStateChange$,
        markdownStateManager.anyStateChange$
      ).pipe(map(() => undefined)),
      getComparators: () => {
        return { ...titleComparators, ...markdownComparators };
      },
      onReset: (lastSaved) => {
        titleManager.reinitializeState(lastSaved);
        markdownStateManager.reinitializeState(lastSaved);
      },
    });

    const api = finalizeApi({
      ...unsavedChangesApi,
      ...titleManager.api,
      serializeState,
      onEdit: async ({ isNewPanel = false } = {}) => {
        if (!apiCanAddNewPanel(parentApi)) throw new IncompatibleActionError();
        isEditing$.next(true);
        overrideHoverActions$.next(true);
        if (isNewPanel !== isNewPanel$.getValue()) {
          isNewPanel$.next(isNewPanel);
        }
        if (apiCanFocusPanel(parentApi)) {
          parentApi.setFocusedPanelId(api.uuid);
        }
      },
      isEditingEnabled: () => true,
      getTypeDisplayName: () => 'Markdown',
      overrideHoverActions$,
      OverriddenHoverActionsComponent: () => (
        <MarkdownEditorPreviewSwitch
          isPreview$={isPreview$}
          isEditing$={isEditing$}
          onSwitch={(isPreview: boolean) => {
            isPreview$.next(isPreview);
          }}
        />
      ),
    });

    return {
      api,
      Component: function MarkdownEmbeddableComponent() {
        const [content, isEditing, viewMode] = useBatchedPublishingSubjects(
          markdownStateManager.api.content$,
          isEditing$,
          getViewModeSubject(api) ?? new BehaviorSubject('view')
        );

        const { processingPlugins: processingPluginList, uiPlugins } =
          getDefaultEuiMarkdownPlugins();

        // openLinksInNewTab functionality from src/platform/packages/shared/shared-ux/markdown/impl/markdown.tsx
        if (processingPluginList[1]?.[1]?.components?.a) {
          processingPluginList[1][1].components.a = (props) => (
            <EuiLink {...props} target="_blank" />
          );
        }

        const editorContent =
          viewMode === 'view' || !isEditing ? (
            <MarkdownRenderer processingPluginList={processingPluginList} content={content} />
          ) : (
            <MarkdownEditor
              uiPlugins={uiPlugins}
              processingPluginList={processingPluginList}
              content={content}
              onCancel={() => {
                if (isNewPanel$.getValue() && apiIsPresentationContainer(parentApi)) {
                  parentApi.removePanel(api.uuid);
                }
                resetEditingState();
              }}
              onSave={(value: string) => {
                resetEditingState();
                markdownStateManager.api.setContent(value);
                if (isNewPanel$.getValue()) {
                  isNewPanel$.next(false);
                }
              }}
              isPreview$={isPreview$}
            />
          );

        return (
          <div
            css={flexCss}
            data-shared-item
            data-rendering-count={1} // TODO: Fix this as part of https://github.com/elastic/kibana/issues/179376
          >
            {editorContent}
          </div>
        );
      },
    };
  },
};
