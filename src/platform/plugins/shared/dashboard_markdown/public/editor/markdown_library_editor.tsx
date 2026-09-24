/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import { BehaviorSubject } from 'rxjs';
import {
  type HasSerializedChildState,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import { EmbeddableEditorPreview } from '@kbn/presentation-util-plugin/public';
import type { MarkdownEmbeddableState, MarkdownByValueState } from '../../server';
import { MARKDOWN_EMBEDDABLE_TYPE } from '../../common';
import type { MarkdownEditorApi } from '../types';
import { MarkdownEditor } from '../components/markdown_editor';
import { getMarkdownPlugins } from '../plugins/get_markdown_plugins';
import { markdownClient } from '../markdown_client/markdown_client';
import { coreServices } from '../services/kibana_services';

const strings = {
  editFlyoutTitle: i18n.translate('dashboardMarkdown.libraryEditor.editFlyoutTitle', {
    defaultMessage: 'Edit markdown',
  }),
  cancelButtonLabel: i18n.translate('dashboardMarkdown.libraryEditor.cancelButtonLabel', {
    defaultMessage: 'Cancel',
  }),
  saveButtonLabel: i18n.translate('dashboardMarkdown.libraryEditor.saveButtonLabel', {
    defaultMessage: 'Save',
  }),
  saveErrorMessage: i18n.translate('dashboardMarkdown.libraryEditor.saveErrorMessage', {
    defaultMessage: 'Unable to save markdown',
  }),
};

export const MarkdownLibraryEditor = ({
  id,
  initialState,
  closeFlyout,
}: {
  id: string;
  initialState: MarkdownByValueState & {
    title: string;
    description?: string;
    tags?: string[];
  };
  closeFlyout: () => void;
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [content, setContent] = useState(initialState.content);
  const settings$ = useMemo(
    () => new BehaviorSubject(initialState.settings),
    [initialState.settings]
  );
  const isInlinePreview$ = useMemo(() => new BehaviorSubject(false), []);
  const settings = useStateFromPublishingSubject(settings$);

  useEffect(() => {
    return () => {
      settings$.complete();
      isInlinePreview$.complete();
    };
  }, [isInlinePreview$, settings$]);

  const { parsingPlugins, processingPlugins, uiPlugins } = useMemo(() => {
    return getMarkdownPlugins(settings.open_links_in_new_tab);
  }, [settings.open_links_in_new_tab]);

  // Memoized so that EmbeddableEditorPreview only sees a new object when content actually changes.
  const draftState = useMemo<MarkdownByValueState>(
    () => ({
      content,
      settings,
      title: initialState.title,
      description: initialState.description,
    }),
    [content, settings, initialState.title, initialState.description]
  );

  const hasChanges =
    content !== initialState.content ||
    settings.open_links_in_new_tab !== initialState.settings.open_links_in_new_tab;

  const save = async () => {
    setIsSaving(true);
    try {
      await markdownClient.update(id, {
        ...initialState,
        content,
        settings,
      });
      closeFlyout();
    } catch (error) {
      coreServices.notifications.toasts.addError(error, {
        title: strings.saveErrorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FlyoutTemplate onClose={closeFlyout} data-test-subj="markdownLibraryEditorFlyout">
      <FlyoutTemplate.Header title={strings.editFlyoutTitle} />
      <FlyoutTemplate.Body>
        <div
          css={css({
            display: 'flex',
            gap: 16,
            minBlockSize: 0,
          })}
        >
          <div css={css({ flex: 1, minInlineSize: 0, minBlockSize: 0 })}>
            <MarkdownEditor
              parsingPluginList={parsingPlugins}
              processingPluginList={processingPlugins}
              uiPlugins={uiPlugins}
              content={content}
              settings$={settings$}
              isPreview$={isInlinePreview$}
              onChange={setContent}
              onCancel={closeFlyout}
              onSave={async () => {}}
              showFooter={false}
            />
          </div>
          <EmbeddableEditorPreview<
            MarkdownEmbeddableState,
            MarkdownEditorApi,
            HasSerializedChildState<MarkdownEmbeddableState>
          >
            type={MARKDOWN_EMBEDDABLE_TYPE}
            serializedState={draftState}
          />
        </div>
      </FlyoutTemplate.Body>
      <FlyoutTemplate.Footer>
        <FlyoutTemplate.Footer.SecondaryAction
          label={strings.cancelButtonLabel}
          onClick={closeFlyout}
        />
        <FlyoutTemplate.Footer.PrimaryAction
          label={strings.saveButtonLabel}
          onClick={() => {
            void save();
          }}
          isDisabled={!hasChanges}
          isLoading={isSaving}
          data-test-subj="markdownEditorApplyButton"
        />
      </FlyoutTemplate.Footer>
    </FlyoutTemplate>
  );
};
