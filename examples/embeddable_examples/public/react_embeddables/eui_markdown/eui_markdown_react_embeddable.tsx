/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiMarkdownEditor,
  EuiMarkdownFormat,
  UseEuiTheme,
  euiCanAnimate,
  getDefaultEuiMarkdownPlugins,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import {
  StateComparators,
  WithAllKeys,
  getViewModeSubject,
  initializeStateManager,
  initializeTitleManager,
  titleComparators,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import React from 'react';
import { BehaviorSubject, map, merge } from 'rxjs';
import { EUI_MARKDOWN_ID } from './constants';
import { MarkdownEditorApi, MarkdownEditorSerializedState, MarkdownEditorState } from './types';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

const defaultMarkdownState: WithAllKeys<MarkdownEditorState> = {
  content: '',
};

const editorStyles = css`
  width: 100%;
  block-size: calc(100% - 40px);
  [data-test-subj='markdown_editor_preview_button'] {
    display: none;
  }
  .euiMarkdownEditorFooter {
    display: none;
  }
`;

const dashboardMarkdownEditorAriaLabel = () => i18n.translate(
  'embeddableExamples.euiMarkdownEditor.embeddableAriaLabel',
  {
    defaultMessage: 'Dashboard markdown editor',
  }
)

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
    const isPreview$ = new BehaviorSubject<boolean>(false);

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
      onEdit: async () => {
        isEditing$.next(true);
        parentApi.focusedPanelId$.next(api.uuid);
      },
      isEditingEnabled: () => true,
      getTypeDisplayName: () => 'Markdown',
      OverridenHoverActionsComponent: () => {
        if (!isEditing$.getValue()) {
          return;
        } else {
          return () => {
            const isPreview = useStateFromPublishingSubject(isPreview$);
            const toggleButtonsCompressed = [
              {
                id: `edit__0`,
                label: 'Editor',
              },
              {
                id: `preview__0`,
                label: 'Preview',
              },
            ];
            return (
              <EuiButtonGroup
                legend="This is a basic group"
                options={toggleButtonsCompressed}
                idSelected={isPreview ? 'preview__0' : 'edit__0'}
                onChange={(id) => {
                  isPreview$.next(id === 'preview__0');
                }}
                buttonSize="compressed"
                type="single"
                css={{
                  background: 'none',
                  padding: 0,
                  marginBottom: '4px',
                  '*': {
                    border: 'none !important',
                  },
                  button: {
                    marginBottom: 0,
                    marginTop: 0,
                  },
                }}
              />
            );
          };
        }
      },
    });

    return {
      api,
      Component: () => {
        // get state for rendering
        const content = useStateFromPublishingSubject(markdownStateManager.api.content$);
        const [value, onChange] = React.useState(content ?? '');
        const viewMode = useStateFromPublishingSubject(
          getViewModeSubject(api) ?? new BehaviorSubject('view')
        );
        const isEditing = useStateFromPublishingSubject(isEditing$);
        const isPreview = useStateFromPublishingSubject(isPreview$);
        
        const excludingPlugins = Array<'lineBreaks' | 'linkValidator' | 'tooltip'>();

        const { euiTheme } = useEuiTheme();
        const { processingPlugins } = getDefaultEuiMarkdownPlugins({
          exclude: excludingPlugins,
        });
        // openLinksInNewTab functionality from https://codesandbox.io/s/relaxed-yalow-hy69r4?file=/demo.js:482-645
        processingPlugins[1][1].components.a = (props) => <EuiLink {...props} target="_blank" />;


        const onCancel = () => {
          isEditing$.next(false);
          isPreview$.next(false);
          parentApi.focusedPanelId$.next();
        };

        const onSave = () => {
          markdownStateManager.api.setContent(value);
          isEditing$.next(false);
          isPreview$.next(false);
          parentApi.focusedPanelId$.next();
        };

        const markdownStyles = {
          formatContainer: css({
            padding: euiTheme.size.base,
            overflow: 'scroll',
            width: '100%',
            img: {
              maxInlineSize: '100%',
            }
          })
        }

        const styles = useMemoCss(markdownStyles);

        if (viewMode === 'view' || !isEditing) {
          return (
            <div
            css={styles.formatContainer}
          >
            <EuiMarkdownFormat
              processingPluginList={processingPlugins}
            >
              {content ?? ''}
            </EuiMarkdownFormat>
            </div>
          );
        }

        return !isPreview ? (
          <div css={css({ width: '100%' })}>
            <EuiMarkdownEditor
              css={editorStyles}
              toolbarProps={{
                right: <div>TODO</div>,
              }}
              value={value}
              onChange={(v) => onChange(v)}
              aria-label={dashboardMarkdownEditorAriaLabel}
              processingPluginList={processingPlugins}
              height="full"
              showFooter="false"
            />
            <EditingFooter onCancel={onCancel} onSave={onSave} />
          </div>
        ) : (
          <div
            css={css`
              width: 100%;
              overflow: scroll;
            `}
          >
            <EuiMarkdownFormat
              processingPluginList={processingPlugins}
              css={css`
                padding: ${euiTheme.size.base};
                img {
                  max-inline-size: 100%;
                }
              `}
            >
              {value ?? content ?? ''}
            </EuiMarkdownFormat>
            <EditingFooter
              onCancel={onCancel}
              onSave={onSave}
              isPreview
            />
          </div>
        );
      },
    };
  },
};

const footerStyles = {
  footer: ({euiTheme}: UseEuiTheme) => css`
  padding: 8px;
  border-radius-bottom: 8px;
  width: 100%;
  border-top: ${euiTheme.colors.borderBasePlain} 1px solid;

 
  position: absolute;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
`,
previewFooter: ({euiTheme}: UseEuiTheme) => css`
   opacity: 0;
   ${euiCanAnimate} {
    transition: opacity ${euiTheme.animation.slow} ease-in;
  }
  .dshDashboardGrid__item:hover & {
    opacity: 1;
  }
`,
}

const EditingFooter = ({ onCancel, onSave, isPreview }: { onCancel: () => void; onSave: () => void, isPreview?: boolean }) => {
  const styles = useMemoCss(footerStyles);
  return (
    <EuiFlexGroup
      responsive={false}
      gutterSize="xs"
      justifyContent="flexEnd"
      css={[styles.footer, isPreview && styles.previewFooter]}
    >
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty color="primary" size="xs" aria-label="Discard" onClick={onCancel}>
          Discard
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="xs"
          iconType={'check'}
          color="primary"
          display="fill"
          fill
          aria-label="Apply"
          onClick={onSave}
        >
          Apply
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
