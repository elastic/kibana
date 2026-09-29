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
  EuiIcon,
  EuiPanel,
  EuiScreenReaderOnly,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { monaco } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { ServiceAccountDetails, ServiceAccountRoles } from './service_account_details';
import type { WorkflowServiceAccount } from '../../../../entities/service_accounts';
import { useKibana } from '../../../../hooks/use_kibana';
import { getRunAsValue } from '../../lib/service_accounts/service_account_editor';
import type { ServiceAccountSuggestion } from '../../lib/service_accounts/service_account_editor';
import { useServiceAccountEditor } from '../hooks/use_service_account_editor';

type Popup =
  | {
      kind: 'suggestions';
      position: monaco.IPosition;
      suggestions: ServiceAccountSuggestion[];
      selected: number;
    }
  | { kind: 'details'; position: monaco.IPosition; account: WorkflowServiceAccount };

const getSuggestionLabel = ({ label }: ServiceAccountSuggestion): string =>
  typeof label === 'string' ? label : label.label;

export const ServiceAccountEditorWidgets = ({
  editor,
}: {
  editor: monaco.editor.IStandaloneCodeEditor | null;
}) => {
  const accounts = useServiceAccountEditor();
  const { cloud, serverless } = useKibana().services;
  const { euiTheme } = useEuiTheme();
  const [popup, setPopup] = useState<Popup | null>(null);
  const popupRef = useRef(popup);
  popupRef.current = popup;
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const chooseRef = useRef<(suggestion: ServiceAccountSuggestion) => void>(() => {});
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const closeRef = useRef<() => void>(() => {});
  const widget = useMemo<monaco.editor.IContentWidget | null>(
    () =>
      node
        ? {
            getId: () => 'workflows.serviceAccount',
            getDomNode: () => node,
            allowEditorOverflow: true,
            suppressMouseDown: true,
            getPosition: () =>
              popupRef.current
                ? {
                    position: popupRef.current.position,
                    preference: [
                      monaco.editor.ContentWidgetPositionPreference.BELOW,
                      monaco.editor.ContentWidgetPositionPreference.ABOVE,
                    ],
                  }
                : null,
          }
        : null,
    [node]
  );

  useEffect(() => {
    if (!editor?.getModel() || !accounts.isEnabled()) return;
    const element = document.createElement('div');
    setNode(element);
    return () => {
      clearTimeout(closeTimer.current);
      setNode(null);
    };
  }, [editor, accounts]);

  useEffect(() => {
    if (!editor || !widget) return;
    editor.addContentWidget(widget);
    return () => editor.removeContentWidget(widget);
  }, [editor, widget]);

  useEffect(() => {
    if (editor && widget) editor.layoutContentWidget(widget);
  }, [editor, widget, popup]);

  useEffect(() => {
    if (!editor || !node) return;
    const pickerVisible = editor.createContextKey<boolean>(
      'workflowServiceAccountPickerVisible',
      false
    );
    const popupVisible = editor.createContextKey<boolean>(
      'workflowServiceAccountPopupVisible',
      false
    );
    const valueFocused = editor.createContextKey<boolean>(
      'workflowServiceAccountValueFocused',
      false
    );
    let completionGeneration = 0;
    let hoverGeneration = 0;
    let filterByTypedValue = false;
    let hoverTimer: ReturnType<typeof setTimeout>;
    let completionTimer: ReturnType<typeof setTimeout>;
    let dismissed = false;
    let hoverSuppressed = false;
    const originalHover = editor.getOption(monaco.editor.EditorOption.hover);
    const originalQuickSuggestions = editor.getOption(monaco.editor.EditorOption.quickSuggestions);
    const originalSuggestOnTrigger = editor.getOption(
      monaco.editor.EditorOption.suggestOnTriggerCharacters
    );
    let suggestionSuppressed = false;
    const restoreSuggestions = () => {
      if (!suggestionSuppressed) return;
      suggestionSuppressed = false;
      editor.updateOptions({
        quickSuggestions: originalQuickSuggestions,
        suggestOnTriggerCharacters: originalSuggestOnTrigger,
      });
    };
    const restoreHover = () => {
      if (!hoverSuppressed) return;
      hoverSuppressed = false;
      editor.updateOptions({ hover: originalHover });
    };
    const closeDetails = () => {
      hoverGeneration++;
      clearTimeout(hoverTimer);
      if (popupRef.current?.kind === 'details') {
        popupVisible.set(false);
        setPopup(null);
      }
      restoreHover();
    };
    const close = () => {
      completionGeneration++;
      hoverGeneration++;
      clearTimeout(hoverTimer);
      pickerVisible.set(false);
      popupVisible.set(false);
      setPopup(null);
      restoreHover();
    };
    closeRef.current = close;
    const complete = async () => {
      const model = editor.getModel();
      const position = editor.getPosition();
      const value = model && position && getRunAsValue(model, position);
      const eligible =
        !!value && !editor.getOption(monaco.editor.EditorOption.readOnly) && editor.hasTextFocus();
      valueFocused.set(Boolean(value));
      if (!eligible || !model || !position || !value) {
        dismissed = false;
        filterByTypedValue = false;
        restoreSuggestions();
        close();
        return;
      }
      if (!suggestionSuppressed) {
        suggestionSuppressed = true;
        editor.updateOptions({ quickSuggestions: false, suggestOnTriggerCharacters: false });
      }
      editor.trigger('serviceAccounts', 'hideSuggestWidget', {});
      if (dismissed) return;
      const version = model.getVersionId();
      const current = ++completionGeneration;
      const query = filterByTypedValue ? value.id.toLocaleLowerCase() : '';
      const result = await accounts.completionProvider.provideCompletionItems(model, position, {
        get isCancellationRequested() {
          return current !== completionGeneration;
        },
        onCancellationRequested: () => ({ dispose() {} }),
      });
      if (
        current !== completionGeneration ||
        model.isDisposed() ||
        model.getVersionId() !== version
      )
        return;
      const suggestions =
        result?.suggestions.filter(
          ({ account }) =>
            !account || `${account.name} ${account.id}`.toLocaleLowerCase().includes(query)
        ) ?? [];
      if (!suggestions.length) {
        close();
        return;
      }
      hoverGeneration++;
      clearTimeout(hoverTimer);
      pickerVisible.set(true);
      popupVisible.set(true);
      setPopup({
        kind: 'suggestions',
        position: { lineNumber: value.range.startLineNumber, column: value.range.startColumn },
        suggestions,
        selected: 0,
      });
    };
    const queueCompletion = () => {
      clearTimeout(completionTimer);
      close();
      completionTimer = setTimeout(complete, 100);
    };
    chooseRef.current = (suggestion) => {
      if (editor.getOption(monaco.editor.EditorOption.readOnly)) return;
      if (!suggestion.account) {
        accounts.loadMore();
        void complete();
        return;
      }
      dismissed = true;
      close();
      editor.pushUndoStop();
      editor.executeEdits('serviceAccount', [
        {
          range: monaco.Range.lift(
            'startLineNumber' in suggestion.range ? suggestion.range : suggestion.range.replace
          ),
          text: suggestion.insertText,
        },
      ]);
      dismissed = true;
      editor.pushUndoStop();
      editor.focus();
    };
    const move = (delta: number) => {
      setPopup((previous) =>
        previous?.kind === 'suggestions'
          ? {
              ...previous,
              selected:
                (previous.selected + delta + previous.suggestions.length) %
                previous.suggestions.length,
            }
          : previous
      );
    };
    const action = (
      id: string,
      keybindings: number[],
      run: () => void,
      precondition = 'workflowServiceAccountPickerVisible'
    ) =>
      editor.addAction({
        id: `workflows.serviceAccount.${id}`,
        label: id,
        keybindings,
        precondition,
        run,
      });
    const disposables = [
      editor.onDidChangeCursorPosition(({ reason }) => {
        if (reason === monaco.editor.CursorChangeReason.Explicit) filterByTypedValue = false;
        queueCompletion();
      }),
      editor.onDidChangeModelContent(({ isFlush, isUndoing, isRedoing }) => {
        dismissed = false;
        filterByTypedValue = !isFlush && !isUndoing && !isRedoing;
        queueCompletion();
      }),
      editor.onDidFocusEditorText(() => {
        filterByTypedValue = false;
        clearTimeout(closeTimer.current);
        queueCompletion();
      }),
      editor.onDidBlurEditorText(() => {
        closeTimer.current = setTimeout(close, 150);
      }),
      editor.onDidChangeModel(() => {
        dismissed = false;
        filterByTypedValue = false;
        close();
        restoreSuggestions();
      }),
      editor.onDidScrollChange(close),
      action('next', [monaco.KeyCode.DownArrow], () => move(1)),
      action('previous', [monaco.KeyCode.UpArrow], () => move(-1)),
      action('accept', [monaco.KeyCode.Enter, monaco.KeyCode.Tab], () => {
        const current = popupRef.current;
        if (current?.kind === 'suggestions')
          chooseRef.current(current.suggestions[current.selected]);
      }),
      action(
        'dismiss',
        [monaco.KeyCode.Escape],
        () => {
          dismissed = true;
          close();
        },
        'workflowServiceAccountPopupVisible'
      ),
      action(
        'suggest',
        [monaco.KeyMod.CtrlCmd + monaco.KeyCode.Space],
        () => {
          dismissed = false;
          filterByTypedValue = false;
          void complete();
        },
        'workflowServiceAccountValueFocused && !editorReadonly'
      ),
      action(
        'details',
        [
          monaco.KeyMod.chord(
            monaco.KeyMod.CtrlCmd + monaco.KeyCode.KeyK,
            monaco.KeyMod.CtrlCmd + monaco.KeyCode.KeyI
          ),
        ],
        () => {
          const model = editor.getModel();
          const position = editor.getPosition();
          if (!model || !position) return;
          close();
          const current = hoverGeneration;
          void accounts.getAccountAtPosition(model, position).then((details) => {
            if (current === hoverGeneration && details) {
              popupVisible.set(true);
              setPopup({ kind: 'details', account: details.account, position });
            }
          });
        },
        'workflowServiceAccountValueFocused'
      ),
      editor.onMouseMove((event) => {
        clearTimeout(hoverTimer);
        clearTimeout(closeTimer.current);
        if (popupRef.current?.kind === 'suggestions' || node.contains(event.target.element)) return;
        const model = editor.getModel();
        const position = event.target.position;
        const value = model && position && getRunAsValue(model, position);
        if (!value?.id || !model || !position) {
          hoverGeneration++;
          if (popupRef.current?.kind === 'details')
            closeTimer.current = setTimeout(closeDetails, 200);
          restoreHover();
          return;
        }
        hoverSuppressed = true;
        editor.updateOptions({ hover: { enabled: false } });
        const current = ++hoverGeneration;
        const version = model.getVersionId();
        hoverTimer = setTimeout(async () => {
          const details = await accounts.getAccountAtPosition(model, position);
          if (current !== hoverGeneration || model.isDisposed() || model.getVersionId() !== version)
            return;
          if (details) {
            popupVisible.set(true);
            setPopup({
              kind: 'details',
              account: details.account,
              position: {
                lineNumber: value.range.startLineNumber,
                column: value.range.startColumn,
              },
            });
          } else restoreHover();
        }, 250);
      }),
      editor.onMouseLeave(() => {
        hoverGeneration++;
        clearTimeout(hoverTimer);
        closeTimer.current = setTimeout(closeDetails, 250);
      }),
    ];
    queueCompletion();
    return () => {
      completionGeneration++;
      hoverGeneration++;
      clearTimeout(hoverTimer);
      clearTimeout(completionTimer);
      clearTimeout(closeTimer.current);
      disposables.forEach((disposable) => disposable.dispose());
      pickerVisible.reset();
      popupVisible.reset();
      valueFocused.reset();
      restoreSuggestions();
      restoreHover();
      setPopup(null);
    };
  }, [editor, node, accounts]);

  useEffect(() => {
    node?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [node, popup]);

  if (!node || !popup) return null;
  const selectedSuggestion =
    popup.kind === 'suggestions' ? popup.suggestions[popup.selected] : undefined;
  return createPortal(
    <EuiPanel
      paddingSize={popup.kind === 'details' ? 'm' : 'none'}
      hasShadow
      data-test-subj="serviceAccountEditorPopup"
      onMouseEnter={() => clearTimeout(closeTimer.current)}
      onMouseLeave={() => {
        closeTimer.current = setTimeout(() => closeRef.current(), 250);
      }}
      css={css({
        width: popup.kind === 'details' ? 340 : 440,
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 320,
        overflowY: 'auto',
      })}
    >
      {popup.kind === 'details' ? (
        <ServiceAccountDetails
          account={popup.account}
          environment={{
            isServerless: cloud?.isServerlessEnabled ?? Boolean(serverless),
            projectName: cloud?.serverless.projectName,
            projectId: cloud?.serverless.projectId,
            projectType: cloud?.serverless.projectType,
          }}
        />
      ) : (
        <>
          <div
            role="listbox"
            aria-label={i18n.translate('workflows.editor.serviceAccountPickerAriaLabel', {
              defaultMessage: 'Service accounts',
            })}
          >
            {popup.suggestions.map((suggestion, index) => (
              <EuiButtonEmpty
                key={suggestion.account?.id ?? 'loadMore'}
                role="option"
                aria-selected={index === popup.selected}
                color="text"
                size="s"
                flush="both"
                data-test-subj="serviceAccountSuggestion"
                onMouseDown={(event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault()}
                onClick={() => chooseRef.current(suggestion)}
                contentProps={{ css: css({ width: '100%' }) }}
                textProps={false}
                css={css({
                  width: '100%',
                  padding: euiTheme.size.s,
                  height: 'auto',
                  textAlign: 'left',
                  fontWeight: euiTheme.font.weight.regular,
                  backgroundColor:
                    index === popup.selected ? euiTheme.colors.backgroundBasePrimary : undefined,
                })}
              >
                <EuiFlexGroup
                  gutterSize="s"
                  alignItems="center"
                  responsive={false}
                  css={css({ width: '100%' })}
                >
                  {suggestion.account && (
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="user" aria-hidden={true} />
                    </EuiFlexItem>
                  )}
                  <EuiFlexItem css={css({ overflowWrap: 'anywhere' })}>
                    {getSuggestionLabel(suggestion)}
                  </EuiFlexItem>
                  {suggestion.account && (
                    <EuiFlexItem grow={false}>
                      <ServiceAccountRoles roles={suggestion.account.roles} />
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiButtonEmpty>
            ))}
          </div>
          <EuiScreenReaderOnly>
            <div role="status" aria-live="polite">
              {selectedSuggestion && getSuggestionLabel(selectedSuggestion)}{' '}
              {selectedSuggestion?.account?.roles.join(', ')}
            </div>
          </EuiScreenReaderOnly>
        </>
      )}
    </EuiPanel>,
    node
  );
};
