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
  getViewModeSubject,
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
import type { MarkdownAttributes } from '../server/markdown_saved_object';

const flexCss = css({
  display: 'flex',
  flex: '1 1 100%',
});

export const markdownEmbeddableFactory: EmbeddableFactory<
  MarkdownEmbeddableState,
  MarkdownEditorApi
> = {
  type: MARKDOWN_EMBEDDABLE_TYPE,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const libraryId = (initialState as MarkdownByReferenceState).ref_id;
    const isByReference = libraryId !== undefined;
    const initialLibraryState = isByReference
      ? await loadFromLibrary(libraryId)
      : ({} as MarkdownAttributes);

    const titleManager = initializeTitleManager(initialState);
    const content$ = new BehaviorSubject<string>(
      isByReference ? initialLibraryState.content : (initialState as MarkdownByValueState).content
    );
    const defaultTitle$ = new BehaviorSubject(initialLibraryState.title);
    const defaultDescription$ = new BehaviorSubject(initialLibraryState.description);
    const isEditing$ = new BehaviorSubject<boolean>(false);
    const isNewPanel$ = new BehaviorSubject<boolean>(false);
    const isPreview$ = new BehaviorSubject<boolean>(false);

    const overrideHoverActions$ = new BehaviorSubject<boolean>(false);

    const serializeByValue = () => ({
      ...titleManager.getLatestState(),
      content: content$.getValue(),
    });

    const serializeByReference = (refId: string) => {
      return {
        ...titleManager.getLatestState(),
        ref_id: refId,
      };
    };

    const serializeState = () =>
      isByReference ? serializeByReference(libraryId) : serializeByValue();

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
        content$.pipe(map(() => undefined))
      ).pipe(map(() => undefined)),
      getComparators: () => {
        return {
          ...titleComparators,
          content: isByReference ? 'skip' : 'referenceEquality',
          ref_id: 'skip',
        };
      },
      onReset: (lastSaved) => {
        titleManager.reinitializeState(lastSaved);
        // There are no unsaved changes to reset for
        // by reference 'content' since by reference 'content' is saved on apply.
        if (!isByReference) {
          content$.next((initialState as MarkdownByValueState).content);
        }
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
          content: content$.getValue(),
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
        const [content, isEditing, viewMode, title, hideTitle] = useBatchedPublishingSubjects(
          content$,
          isEditing$,
          getViewModeSubject(api) ?? new BehaviorSubject('view'),
          titleManager.api.title$,
          titleManager.api.hideTitle$
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
            <MarkdownRenderer
              processingPluginList={processingPluginList}
              content={content}
              title={hideTitle ? undefined : title} // we will reduce the upper padding when the panel has a title
            />
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
                content$.next(value);
                if (libraryId) {
                  await markdownClient.update(libraryId, {
                    content: value,
                    title: titleManager.api.title$.getValue(),
                    description: titleManager.api.description$.getValue(),
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
