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
import {
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  euiMarkdownLinkValidator,
  getDefaultEuiMarkdownPlugins,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { BehaviorSubject } from 'rxjs';
import type { HasSerializedChildState } from '@kbn/presentation-publishing';
import { EmbeddableEditorPreview, ManagedEditorFooter } from '@kbn/presentation-util-plugin/public';
import type { MarkdownEmbeddableState, MarkdownByValueState } from '../../server';
import { MARKDOWN_EMBEDDABLE_TYPE } from '../../common';
import type { MarkdownEditorApi } from '../types';
import { MarkdownEditor } from '../components/markdown_editor';
import { resolveRelativeLinksPlugin } from '../plugins/resolve_relative_links';
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
  const [settings, setSettings] = useState(initialState.settings);

  useEffect(() => {
    const subscription = settings$.subscribe(setSettings);
    return () => {
      subscription.unsubscribe();
      settings$.complete();
      isInlinePreview$.complete();
    };
  }, [isInlinePreview$, settings$]);

  const { parsingPlugins, processingPlugins, uiPlugins } = useMemo(() => {
    const plugins = getDefaultEuiMarkdownPlugins({
      processingConfig: {
        linkProps: { target: settings.open_links_in_new_tab ? '_blank' : '_self' },
      },
    });
    const validatorIndex = plugins.parsingPlugins.findIndex(
      (entry) => (Array.isArray(entry) ? entry[0] : entry) === euiMarkdownLinkValidator
    );
    plugins.parsingPlugins.splice(
      validatorIndex === -1 ? plugins.parsingPlugins.length : validatorIndex,
      0,
      [resolveRelativeLinksPlugin(), {}]
    );
    return plugins;
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
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>{strings.editFlyoutTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        css={css({
          '.euiFlyoutBody__overflow': { overflow: 'hidden' },
          '.euiFlyoutBody__overflowContent': { blockSize: '100%', position: 'relative' },
        })}
      >
        <MarkdownEditor
          parsingPluginList={parsingPlugins}
          processingPluginList={processingPlugins}
          uiPlugins={uiPlugins}
          content={initialState.content}
          settings$={settings$}
          isPreview$={isInlinePreview$}
          onChange={setContent}
          onCancel={closeFlyout}
          onSave={async () => {}}
          showFooter={false}
        />
      </EuiFlyoutBody>
      <ManagedEditorFooter
        onCancel={closeFlyout}
        cancelButtonLabel={strings.cancelButtonLabel}
        onSave={save}
        saveButtonLabel={strings.saveButtonLabel}
        isSaveDisabled={!hasChanges}
        isSaving={isSaving}
        saveButtonDataTestSubj="markdownEditorApplyButton"
      />
      <EmbeddableEditorPreview<
        MarkdownEmbeddableState,
        MarkdownEditorApi,
        HasSerializedChildState<MarkdownEmbeddableState>
      >
        type={MARKDOWN_EMBEDDABLE_TYPE}
        serializedState={draftState}
      />
    </>
  );
};
