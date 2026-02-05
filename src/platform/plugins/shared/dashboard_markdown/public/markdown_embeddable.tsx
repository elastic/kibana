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
import {
  apiCanAddNewPanel,
  apiCanFocusPanel,
  apiIsPresentationContainer,
  initializeUnsavedChanges,
} from '@kbn/presentation-containers';
import type { StateComparators } from '@kbn/presentation-publishing';
import {
  getViewModeSubject,
  initializeStateManager,
  initializeTitleManager,
  titleComparators,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import React from 'react';
import { BehaviorSubject, map, merge } from 'rxjs';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type {
  MarkdownEmbeddableState,
  MarkdownByValueState,
  MarkdownByReferenceState,
} from '../server';
import { APP_NAME, MARKDOWN_EMBEDDABLE_TYPE } from '../common/constants';
import type { MarkdownEditorApi } from './types';
import { MarkdownEditor } from './components/markdown_editor';
import { MarkdownEditorPreviewSwitch } from './components/markdown_editor_preview_switch';
import { MarkdownRenderer } from './components/markdown_renderer';
import { loadFromLibrary } from './markdown_client/load_from_library';
import { checkForDuplicateTitle } from './markdown_client/duplicate_title_check';
import { markdownClient } from './markdown_client/markdown_client';
import type { MarkdownSavedObjectAttributes } from '../server/markdown_saved_object';

const defaultMarkdownState: MarkdownByValueState = {
  content: '',
};

const flexCss = css({
  display: 'flex',
  flex: '1 1 100%',
});

const markdownComparators: StateComparators<MarkdownByValueState> = {
  content: 'referenceEquality',
};

export const markdownEmbeddableFactory: EmbeddableFactory<
  MarkdownEmbeddableState,
  MarkdownEditorApi
> = {
  type: MARKDOWN_EMBEDDABLE_TYPE,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const savedObjectId = (initialState as MarkdownByReferenceState).savedObjectId;
    const isByReference = savedObjectId !== undefined;
    const initialStoredState = isByReference
      ? await loadFromLibrary(savedObjectId)
      : ({} as MarkdownSavedObjectAttributes);

    const titleManager = initializeTitleManager(initialState);
    const markdownStateManager = initializeStateManager<MarkdownByValueState>(
      {
        content: isByReference
          ? initialStoredState.content
          : (initialState as MarkdownByValueState).content,
      },
      defaultMarkdownState
    );

    const defaultTitle$ = new BehaviorSubject(initialStoredState?.title || initialState.title);
    const defaultDescription$ = new BehaviorSubject(
      initialStoredState?.description || initialState.description
    );
    const isEditing$ = new BehaviorSubject<boolean>(false);
    const isNewPanel$ = new BehaviorSubject<boolean>(false);
    const isPreview$ = new BehaviorSubject<boolean>(false);

    const overrideHoverActions$ = new BehaviorSubject<boolean>(false);

    const serializeByValue = () => ({
      ...titleManager.getLatestState(),
      ...markdownStateManager.getLatestState(),
    });

    const serializeByReference = (libraryId: string) => {
      return {
        ...titleManager.getLatestState(),
        savedObjectId: libraryId,
      };
    };

    const serializeState = () =>
      isByReference ? serializeByReference(savedObjectId) : serializeByValue();

    const resetEditingState = () => {
      isEditing$.next(false);
      overrideHoverActions$.next(false);
      isPreview$.next(false);
      if (apiCanFocusPanel(parentApi)) {
        parentApi.setFocusedPanelId();
      }
    };

    const unsavedChangesApi = initializeUnsavedChanges<MarkdownEmbeddableState>({
      uuid,
      parentApi,
      serializeState,
      anyStateChange$: merge(
        titleManager.anyStateChange$,
        markdownStateManager.anyStateChange$
      ).pipe(map(() => undefined)),
      getComparators: () => {
        return { ...titleComparators, ...markdownComparators, savedObjectId: 'skip' };
      },
      onReset: (lastSaved) => {
        titleManager.reinitializeState(lastSaved);
        markdownStateManager.reinitializeState(lastSaved as MarkdownByValueState);
      },
    });

    const api = finalizeApi({
      ...unsavedChangesApi,
      ...titleManager.api,
      defaultTitle$,
      defaultDescription$,
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
      getTypeDisplayName: () => APP_NAME,
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
      // Library transforms
      saveToLibrary: async (title: string) => {
        const { id } = await markdownClient.create({
          ...markdownStateManager.getLatestState(),
          title,
          description: titleManager.getLatestState().description,
        });
        return id;
      },
      getSerializedStateByValue: serializeByValue,
      getSerializedStateByReference: serializeByReference,
      canLinkToLibrary: async () => !isByReference,
      canUnlinkFromLibrary: async () => isByReference,
      checkForDuplicateTitle: async (
        newTitle: string,
        isTitleDuplicateConfirmed: boolean,
        onTitleDuplicate: () => void
      ) => {
        await checkForDuplicateTitle({
          title: newTitle,
          copyOnSave: false,
          lastSavedTitle: '',
          isTitleDuplicateConfirmed,
          onTitleDuplicate,
        });
      },
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
              onSave={async (value: string): Promise<void> => {
                resetEditingState();
                markdownStateManager.api.setContent(value);
                if (savedObjectId) {
                  await markdownClient.update(savedObjectId, {
                    content: value,
                    title: titleManager.api.title$!.getValue(),
                    description: titleManager.api.description$!.getValue(),
                  });
                }
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
