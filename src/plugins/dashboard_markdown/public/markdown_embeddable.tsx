/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownEditor,
  EuiMarkdownFormat,
  EuiTab,
  EuiTabs,
  getDefaultEuiMarkdownParsingPlugins,
  getDefaultEuiMarkdownProcessingPlugins,
  getDefaultEuiMarkdownUiPlugins,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  apiIsOfType,
  getRequiredViewModeSubject,
  initializeTitles,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { useEffect, useMemo, useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import { apiCanFocusPanels } from '@kbn/presentation-containers/interfaces/tracks_overlays';
import { MARKDOWN_ID } from './constants';
import { getDashboardLinksPlugin } from './dashboard_links/dashboard_links_plugin';
import { extractDashboardLinkReferences } from './dashboard_links/dashboard_link_references';
import {
  MarkdownEditorApi,
  MarkdownEditorRuntimeState,
  MarkdownEditorSerializedState,
} from './types';

const EuiMarkdownStyleOverrides = css`
  width: 100%;

  .euiMarkdownEditorToolbar,
  .euiMarkdownEditorFooter,
  .euiMarkdownEditorTextArea {
    background-color: none;
    border-radius: 0;
    border: none;
  }

  .euiMarkdownEditorFooter,
  .euiMarkdownEditorToolbar {
    border-top: 1px solid ${euiThemeVars.euiBorderColor};
    min-height: 40px;
  }
  .euiMarkdownEditorFooter__actions {
    display: none;
  }
  .euiMarkdownEditorToolbar {
    border-bottom: 1px solid ${euiThemeVars.euiBorderColor};
  }

  button[data-test-subj='markdown_editor_preview_button'] {
    display: none;
  }
`;

export const markdownEmbeddableFactory: ReactEmbeddableFactory<
  MarkdownEditorSerializedState,
  MarkdownEditorRuntimeState,
  MarkdownEditorApi
> = {
  type: MARKDOWN_ID,
  deserializeState: (state) => state.rawState,
  buildEmbeddable: async (state, buildApi) => {
    const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);
    const content$ = new BehaviorSubject(state.content);
    const isEditing$ = new BehaviorSubject(false);
    const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);

    let isNewlyCreated: boolean = true;
    let editBackupContent: string | undefined = state.content;

    const api = buildApi(
      {
        ...titlesApi,
        blockingError: blockingError$,
        onEdit: async () => {
          isEditing$.next(true);
          editBackupContent = content$.getValue();
          if (api.parentApi && apiCanFocusPanels(api.parentApi)) {
            api.parentApi.setFocusedPanelId(api.uuid);
          }
        },
        isEditingEnabled: () => !isEditing$.getValue(),
        getTypeDisplayName: () =>
          i18n.translate('embeddableExamples.euiMarkdownEditor.type', {
            defaultMessage: 'Markdown',
          }),
        serializeState: () => {
          const markdownContent = content$.getValue();
          const references = extractDashboardLinkReferences(markdownContent);
          return {
            references,
            rawState: {
              ...serializeTitles(),
              content: markdownContent,
            },
          };
        },
      },
      {
        content: [content$, (value) => content$.next(value)],
        ...titleComparators,
      }
    );

    const onStopEditing = (isCancel = false) => {
      isEditing$.next(false);
      if (api.parentApi && apiCanFocusPanels(api.parentApi)) {
        api.parentApi.setFocusedPanelId(undefined);
      }

      /**
       * delete this panel if it's newly created, the user cancels, and there was
       * no content before the user started editing.
       */
      if (isNewlyCreated && isCancel && !editBackupContent) {
        api.parentApi?.removePanel(api.uuid);
        return;
      }
      isNewlyCreated = false;
    };

    const setupPlugins = () => {
      const parsingPlugins = getDefaultEuiMarkdownParsingPlugins();
      const processingPlugins = getDefaultEuiMarkdownProcessingPlugins();
      const uiPlugins = getDefaultEuiMarkdownUiPlugins();

      if (apiIsOfType(api.parentApi, 'dashboard')) {
        const { DashboardLinkParser, DashboardLinkRenderer, DashboardLinkEditorUi } =
          getDashboardLinksPlugin(api);

        parsingPlugins.push(DashboardLinkParser);
        processingPlugins[1][1].components.DashboardLinks = DashboardLinkRenderer;
        uiPlugins.push(DashboardLinkEditorUi);
      }
      return { parsingPlugins, processingPlugins, uiPlugins };
    };

    const viewModeSubject = getRequiredViewModeSubject(api);
    const viewModeSubscription = viewModeSubject.subscribe((viewMode) => {
      if (viewMode !== 'edit') isEditing$.next(false);
    });

    const { parsingPlugins, processingPlugins, uiPlugins } = setupPlugins();

    return {
      api,
      Component: () => {
        const content = useStateFromPublishingSubject(content$);
        const isEditing = useStateFromPublishingSubject(isEditing$);
        const [selectedTabId, setSelectedTabId] = useState('editor');

        const onSelectedTabChanged = (id: string) => {
          setSelectedTabId(id);
        };
        const tabs = useMemo(
          () => [
            {
              id: 'editor',
              name: i18n.translate('embeddableExamples.euiMarkdownEditor.editor', {
                defaultMessage: 'Editor',
              }),
              content: (
                <EuiMarkdownEditor
                  value={content ?? ''}
                  css={EuiMarkdownStyleOverrides}
                  onChange={(value) => content$.next(value)}
                  aria-label={i18n.translate('embeddableExamples.euiMarkdownEditor.ariaLabel', {
                    defaultMessage: 'Dashboard markdown editor',
                  })}
                  uiPlugins={uiPlugins}
                  processingPluginList={processingPlugins}
                  parsingPluginList={parsingPlugins}
                  height="full"
                />
              ),
            },
            {
              id: 'preview',
              name: i18n.translate('embeddableExamples.euiMarkdownEditor.preview', {
                defaultMessage: 'Preview',
              }),
              content: (
                <EuiMarkdownFormat
                  tabIndex={0}
                  className="eui-yScroll"
                  css={css`
                    width: 100%;
                    padding: ${euiThemeVars.euiSizeM};
                  `}
                  parsingPluginList={parsingPlugins}
                  processingPluginList={processingPlugins}
                >
                  {content ?? ''}
                </EuiMarkdownFormat>
              ),
            },
          ],
          [content]
        );

        const renderTabs = () => {
          return tabs.map((tab, index) => (
            <EuiTab
              key={index}
              onClick={() => onSelectedTabChanged(tab.id)}
              isSelected={tab.id === selectedTabId}
            >
              {tab.name}
            </EuiTab>
          ));
        };

        const selectedTabContent = useMemo(() => {
          return tabs.find((obj) => obj.id === selectedTabId);
        }, [selectedTabId, tabs]);

        useEffect(() => {
          return () => viewModeSubscription.unsubscribe();
        }, []);

        return isEditing ? (
          <>
            <EuiTabs
              size="s"
              css={css`
                position: absolute;
                width: 100%;
                padding: ${euiThemeVars.euiSizeM};
                z-index: 1;
                top: 0;
              `}
              bottomBorder={false}
            >
              {renderTabs()}
            </EuiTabs>
            <div
              css={css`
                position: relative;
                width: 100%;
              `}
            >
              <span
                css={css`
                  padding: ${euiThemeVars.euiSizeXS};
                  position: absolute;
                  bottom: 0;
                  right: 0;
                  z-index: 12;
                `}
              >
                <EuiFlexGroup gutterSize="xs">
                  <EuiFlexItem>
                    <EuiButtonEmpty
                      size="s"
                      color="text"
                      onClick={() => {
                        if (editBackupContent) content$.next(editBackupContent);
                        onStopEditing(true);
                      }}
                    >
                      {i18n.translate('embeddableExamples.euiMarkdownEditor.cancel', {
                        defaultMessage: 'Cancel',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiButtonEmpty size="s" iconType="save" onClick={() => onStopEditing()}>
                      {i18n.translate('embeddableExamples.euiMarkdownEditor.save', {
                        defaultMessage: 'Save',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </span>
              {selectedTabContent?.content}
            </div>
          </>
        ) : (
          <EuiMarkdownFormat
            tabIndex={0}
            className="eui-yScroll"
            css={css`
              width: 100%;
              padding: ${euiThemeVars.euiSizeM};
            `}
            parsingPluginList={parsingPlugins}
            processingPluginList={processingPlugins}
          >
            {content ?? ''}
          </EuiMarkdownFormat>
        );
      },
    };
  },
};
