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
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  euiMarkdownLinkValidator,
  getDefaultEuiMarkdownPlugins,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { BehaviorSubject } from 'rxjs';
import type { HasSerializedChildState } from '@kbn/presentation-publishing';
import { EmbeddableEditorPreview } from '@kbn/presentation-util-plugin/public';
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
  openPreviewButtonLabel: i18n.translate('dashboardMarkdown.libraryEditor.openPreviewButtonLabel', {
    defaultMessage: 'Open preview',
  }),
  cancelButtonLabel: i18n.translate('dashboardMarkdown.libraryEditor.cancelButtonLabel', {
    defaultMessage: 'Cancel',
  }),
  saveButtonLabel: i18n.translate('dashboardMarkdown.libraryEditor.saveButtonLabel', {
    defaultMessage: 'Save',
  }),
  runPreviewButtonLabel: i18n.translate('dashboardMarkdown.libraryEditor.runPreviewButtonLabel', {
    defaultMessage: 'Run preview',
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
  const isNarrowScreen = useIsWithinBreakpoints(['xs', 's', 'm']);
  const [isPreviewOpen, setIsPreviewOpen] = useState(!isNarrowScreen);
  const [isSaving, setIsSaving] = useState(false);
  const [content, setContent] = useState(initialState.content);
  const settings$ = useMemo(
    () => new BehaviorSubject(initialState.settings),
    [initialState.settings]
  );
  const isInlinePreview$ = useMemo(() => new BehaviorSubject(false), []);
  const [settings, setSettings] = useState(initialState.settings);
  const [previewState, setPreviewState] = useState<MarkdownByValueState>({
    content: initialState.content,
    settings: initialState.settings,
    title: initialState.title,
    description: initialState.description,
  });

  useEffect(() => {
    if (isNarrowScreen) setIsPreviewOpen(false);
  }, [isNarrowScreen]);

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

  const draftState: MarkdownByValueState = {
    content,
    settings,
    title: initialState.title,
    description: initialState.description,
  };
  const hasChanges =
    content !== initialState.content ||
    settings.open_links_in_new_tab !== initialState.settings.open_links_in_new_tab;
  const hasUnpreviewedChanges =
    content !== previewState.content ||
    settings.open_links_in_new_tab !== previewState.settings.open_links_in_new_tab;

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
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2>{strings.editFlyoutTitle}</h2>
            </EuiTitle>
          </EuiFlexItem>
          {!isPreviewOpen ? (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="inspect"
                onClick={() => setIsPreviewOpen(true)}
                data-test-subj="markdownLibraryEditorOpenPreviewButton"
              >
                {strings.openPreviewButtonLabel}
              </EuiButtonEmpty>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
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
      <EuiFlyoutFooter>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout} flush="left">
              {strings.cancelButtonLabel}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="success"
                  data-test-subj="markdownEditorRunPreviewButton"
                  disabled={!hasUnpreviewedChanges}
                  iconType="play"
                  onClick={() => setPreviewState(draftState)}
                >
                  {strings.runPreviewButtonLabel}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="markdownEditorApplyButton"
                  disabled={!hasChanges || isSaving}
                  fill
                  isLoading={isSaving}
                  onClick={save}
                >
                  {strings.saveButtonLabel}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
      <EmbeddableEditorPreview<
        MarkdownEmbeddableState,
        MarkdownEditorApi,
        HasSerializedChildState<MarkdownEmbeddableState>
      >
        type={MARKDOWN_EMBEDDABLE_TYPE}
        serializedState={previewState}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </>
  );
};
