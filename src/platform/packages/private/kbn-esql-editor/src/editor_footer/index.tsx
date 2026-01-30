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
  EuiButtonIcon,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { Interpolation, Theme } from '@emotion/react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  LanguageDocumentationFlyout,
  LanguageDocumentationInline,
} from '@kbn/language-documentation';
import React, { memo, useCallback, useState } from 'react';
import type { MonacoMessage } from '@kbn/monaco/src/languages/esql/language';
import type { QuerySource } from '@kbn/esql-types/src/esql_telemetry_types';
import type { ESQLQueryStats as QueryStats } from '@kbn/esql-types';
import { isMac } from '@kbn/shared-ux-utility';
import type { DataErrorsControl, ESQLEditorDeps } from '../types';
import { HistoryAndStarredQueriesTabs, QueryHistoryAction } from './history_starred_queries';
import { KeyboardShortcuts } from './keyboard_shortcuts';
import { QueryWrapComponent } from './query_wrap_component';
import { ESQLQueryStats } from './query_stats';
import { ErrorsWarningsFooterPopover } from './errors_warnings_popover';
import { QuickSearchAction } from '../editor_visor/quick_search_action';

const COMMAND_KEY = isMac ? '⌘' : '^';

interface EditorFooterProps {
  styles: {
    bottomContainer: Interpolation<Theme>;
    historyContainer: Interpolation<Theme>;
  };
  errors?: MonacoMessage[];
  warnings?: MonacoMessage[];
  onErrorClick: (error: MonacoMessage) => void;
  onUpdateAndSubmitQuery: (newQuery: string, querySource: QuerySource) => void;
  onPrettifyQuery: () => void;
  isHistoryOpen: boolean;
  setIsHistoryOpen: (status: boolean) => void;
  isLanguageComponentOpen: boolean;
  setIsLanguageComponentOpen: (status: boolean) => void;
  measuredContainerWidth: number;
  resizableContainerButton?: JSX.Element;
  resizableContainerHeight: number;
  hideRunQueryText?: boolean;
  editorIsInline?: boolean;
  isSpaceReduced?: boolean;
  hideQueryHistory?: boolean;
  hideQuickSearch?: boolean;
  displayDocumentationAsFlyout?: boolean;
  dataErrorsControl?: DataErrorsControl;
  toggleVisor: () => void;
  queryStats?: QueryStats;
}

export const EditorFooter = memo(function EditorFooter({
  styles,
  onUpdateAndSubmitQuery,
  onPrettifyQuery,
  hideRunQueryText,
  editorIsInline,
  isSpaceReduced,
  resizableContainerButton,
  resizableContainerHeight,
  isHistoryOpen,
  setIsHistoryOpen,
  isLanguageComponentOpen,
  setIsLanguageComponentOpen,
  hideQueryHistory,
  hideQuickSearch,
  displayDocumentationAsFlyout,
  measuredContainerWidth,
  errors,
  warnings,
  onErrorClick,
  dataErrorsControl,
  queryStats,
  toggleVisor,
}: EditorFooterProps) {
  const kibana = useKibana<ESQLEditorDeps>();
  const { docLinks } = kibana.services;

  const [isErrorPopoverOpen, setIsErrorPopoverOpen] = useState(false);
  const [isWarningPopoverOpen, setIsWarningPopoverOpen] = useState(false);

  const toggleHistoryComponent = useCallback(() => {
    setIsHistoryOpen(!isHistoryOpen);
    setIsLanguageComponentOpen(false);
  }, [isHistoryOpen, setIsHistoryOpen, setIsLanguageComponentOpen]);

  const toggleLanguageComponent = useCallback(async () => {
    setIsLanguageComponentOpen(!isLanguageComponentOpen);
    setIsHistoryOpen(false);
  }, [isLanguageComponentOpen, setIsHistoryOpen, setIsLanguageComponentOpen]);

  return (
    <EuiFlexGroup
      gutterSize="none"
      responsive={false}
      direction="column"
      css={css`
        width: 100%;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          gutterSize="s"
          justifyContent="spaceBetween"
          data-test-subj="ESQLEditor-footer"
          css={styles.bottomContainer}
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="none" responsive={false} alignItems="center">
              <QueryWrapComponent onPrettifyQuery={onPrettifyQuery} />
              {queryStats && <ESQLQueryStats queryStats={queryStats} />}
              {errors && errors.length > 0 && (
                <ErrorsWarningsFooterPopover
                  isPopoverOpen={isErrorPopoverOpen}
                  items={errors}
                  type="error"
                  setIsPopoverOpen={(isOpen) => {
                    if (isOpen) {
                      setIsWarningPopoverOpen(false);
                    }
                    setIsErrorPopoverOpen(isOpen);
                  }}
                  onErrorClick={onErrorClick}
                  dataErrorsControl={dataErrorsControl}
                />
              )}
              {warnings && warnings.length > 0 && (
                <ErrorsWarningsFooterPopover
                  isPopoverOpen={isWarningPopoverOpen}
                  items={warnings}
                  type="warning"
                  setIsPopoverOpen={(isOpen) => {
                    if (isOpen) {
                      setIsErrorPopoverOpen(false);
                    }
                    setIsWarningPopoverOpen(isOpen);
                  }}
                  onErrorClick={onErrorClick}
                />
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
              {!Boolean(editorIsInline) && (
                <>
                  {!hideQuickSearch && <QuickSearchAction toggleVisor={toggleVisor} />}
                  {!hideQueryHistory && (
                    <QueryHistoryAction
                      toggleHistory={() => setIsHistoryOpen(!isHistoryOpen)}
                      isHistoryOpen={isHistoryOpen}
                    />
                  )}
                  <KeyboardShortcuts />
                </>
              )}
              {!hideRunQueryText && (
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued" data-test-subj="ESQLEditor-run-query">
                        <p>
                          {i18n.translate('esqlEditor.query.runQuery', {
                            defaultMessage: 'Run query',
                          })}
                        </p>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiCode
                        transparentBackground
                        css={css`
                          font-size: 12px;
                        `}
                      >{`${COMMAND_KEY} + Enter`}</EuiCode>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              )}
              {displayDocumentationAsFlyout && !Boolean(editorIsInline) && (
                <>
                  <EuiButtonEmpty
                    iconType="documentation"
                    color="text"
                    data-test-subj="ESQLEditor-documentation"
                    size="m"
                    onClick={() => toggleLanguageComponent()}
                    aria-label={i18n.translate('esqlEditor.query.documentationAriaLabel', {
                      defaultMessage: 'Open documentation',
                    })}
                    css={css`
                      cursor: pointer;
                    `}
                  />
                  <LanguageDocumentationFlyout
                    searchInDescription
                    linkToDocumentation={docLinks?.links?.query?.queryESQL ?? ''}
                    isHelpMenuOpen={isLanguageComponentOpen}
                    onHelpMenuVisibilityChange={setIsLanguageComponentOpen}
                  />
                </>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          {Boolean(editorIsInline) && (
            <>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
                  {!hideQuickSearch && (
                    <QuickSearchAction toggleVisor={toggleVisor} isSpaceReduced={true} />
                  )}
                  {!hideQueryHistory && (
                    <QueryHistoryAction
                      toggleHistory={toggleHistoryComponent}
                      isHistoryOpen={isHistoryOpen}
                      isSpaceReduced={true}
                    />
                  )}
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      position="top"
                      content={i18n.translate('esqlEditor.query.quickReferenceLabel', {
                        defaultMessage: 'Quick reference',
                      })}
                    >
                      <EuiButtonIcon
                        iconType="documentation"
                        onClick={toggleLanguageComponent}
                        aria-label={i18n.translate('esqlEditor.query.documentationAriaLabel', {
                          defaultMessage: 'Open documentation',
                        })}
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                  <KeyboardShortcuts />
                </EuiFlexGroup>
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      {isHistoryOpen && (
        <EuiFlexItem grow={false}>
          <HistoryAndStarredQueriesTabs
            containerCSS={styles.historyContainer}
            onUpdateAndSubmit={onUpdateAndSubmitQuery}
            containerWidth={measuredContainerWidth}
            height={resizableContainerHeight}
            isSpaceReduced={isSpaceReduced}
          />
        </EuiFlexItem>
      )}
      {isLanguageComponentOpen && editorIsInline && (
        <EuiFlexItem grow={false}>
          <LanguageDocumentationInline searchInDescription height={resizableContainerHeight} />
        </EuiFlexItem>
      )}
      {resizableContainerButton}
    </EuiFlexGroup>
  );
});
