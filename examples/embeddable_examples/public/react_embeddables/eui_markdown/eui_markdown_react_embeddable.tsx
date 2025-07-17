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
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiMarkdownEditor,
  EuiMarkdownFormat,
  EuiToolTip,
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
        isEditing$.next(!isEditing$.getValue());
        parentApi.focusedPanelId$.next(api.uuid);
      },
      isEditingEnabled: () => true,
      getTypeDisplayName: () => 'Markdown',
    });

    return {
      api,
      Component: () => {
        // get state for rendering
        const content = useStateFromPublishingSubject(markdownStateManager.api.content$);
        const viewMode = useStateFromPublishingSubject(
          getViewModeSubject(api) ?? new BehaviorSubject('view')
        );
        const isEditing = useStateFromPublishingSubject(isEditing$);
        console.log('isEditing', isEditing);
        const excludingPlugins = Array<'lineBreaks' | 'linkValidator' | 'tooltip'>();

        const { euiTheme } = useEuiTheme();
        const { parsingPlugins, processingPlugins, uiPlugins } = getDefaultEuiMarkdownPlugins({
          exclude: excludingPlugins,
        });
        // openLinksInNewTab functionality from https://codesandbox.io/s/relaxed-yalow-hy69r4?file=/demo.js:482-645
        processingPlugins[1][1].components.a = (props) => <EuiLink {...props} target="_blank" />;

        processingPlugins[1][1].components.img = (props) => <img {...props} style={{maxWidth: '100%'}}/>

        console.log('CHECK', processingPlugins[1][1].components);

        // const markdownRef = React.useRef(null);

        const [value, onChange] = React.useState(content ?? '');

        //  className="embPanel__hoverActions"

        return viewMode === 'edit' && isEditing$.getValue() ? (
          <>
            <EuiMarkdownEditor
              // ref={markdownRef}
              css={css`
                width: 100%;
                [data-test-subj='markdown_editor_preview_button'] {
                  display: none;
                };
              `}
              value={value}
              onChange={(v) => onChange(v)}
              aria-label={i18n.translate(
                'embeddableExamples.euiMarkdownEditor.embeddableAriaLabel',
                {
                  defaultMessage: 'Dashboard markdown editor',
                }
              )}
              processingPluginList={processingPlugins}
              height="full"
              uiPlugins={uiPlugins}
            />

            <EuiFlexGroup
              gutterSize="xs"
              css={css`
                position: absolute;
                right: 0;
                padding: 4px;
              `}
            >
               <EuiFlexItem>
             
                  <EuiButtonEmpty
                    color="primary"
                    // display="base"
                    size="xs"
                    // iconSize="m"
                    // iconType={'cross'}
                    aria-label="Discard"
                    onClick={() => {
                      // markdownStateManager.api.setContent(value);
                      isEditing$.next(false);
                      parentApi.focusedPanelId$.next();
                    }}
                  >Discard
                  </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem>
             
                  <EuiButton
                  size="xs"
                    iconType={'check'}
                    color="primary"
                    display="fill"
                    fill
                    aria-label="Apply"
                    onClick={() => {
                      markdownStateManager.api.setContent(value);
                      isEditing$.next(false);
                      parentApi.focusedPanelId$.next();
                    }}
                  >Apply
                  </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        ) : (
          <EuiMarkdownFormat
            css={css`
              padding: ${euiTheme.size.m};
              overflow: scroll;
              img {
                max-inline-size: 100%;
              }
            `}
          >
            {content ?? ''}
          </EuiMarkdownFormat>
        );
      },
    };
  },
};

const CustomEditingActions = () => {
  return (
    <div>
      <button>Save</button>
    </div>
  );
};
