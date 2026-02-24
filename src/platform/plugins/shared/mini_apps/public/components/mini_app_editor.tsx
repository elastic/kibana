/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiConfirmModal,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPageTemplate,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiResizableContainer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useParams } from 'react-router-dom';
import { CodeEditor } from '@kbn/code-editor';
import { css } from '@emotion/react';
import {
  createScriptPanelBridge,
  createEsqlExecutor,
  createPanelCapabilities,
  getKibanaCspNonce,
  type ScriptPanelBridge,
  type PanelSize,
  type LogEntry,
  type RuntimeState,
} from '@kbn/script-panel/public';
import type { MiniApp, MiniAppVersion } from '../../common';
import { useMiniAppsContext } from '../context';
import { useAgentBuilder } from '../hooks/use_agent_builder';
import { usePollMiniApp } from '../hooks/use_poll_mini_app';
import { PREACT_PRELUDE_SCRIPTS } from '../runtime/preact_libs';
import { useNavigateConfirmation } from '../hooks/use_navigate_confirmation';
import { useDraftStorage } from '../hooks/use_draft_storage';

const DEFAULT_SCRIPT = `// Welcome to Mini Apps!
// Use Kibana.render.setContent() to display content
// Use Kibana.esql.query() to fetch data

async function main() {
  // Example: Display a simple message
  Kibana.render.setContent(\`
    <div style="padding: 20px; font-family: sans-serif;">
      <h1>Hello, Mini Apps!</h1>
      <p>Edit this code to create your custom application.</p>
    </div>
  \`);
}

main();
`;

const sectionContentCss = css({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
});

const resizableContainerCss = css({
  flex: '1 1 0',
  minHeight: 0,
});

const previewWrapperCss = css({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
});

const previewToolbarCss = css({
  display: 'flex',
  alignItems: 'center',
  flexGrow: 0,
  gap: 8,
  padding: '4px 8px',
  borderBottom: '1px solid #d3dae6',
});

const consoleToolbarCss = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0,
  padding: '2px 8px',
  borderBottom: '1px solid #d3dae6',
});

const consoleListCss = css({
  flex: '1 1 0',
  minHeight: 0,
  overflowY: 'auto',
  fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
  fontSize: 12,
  lineHeight: 1.4,
  padding: 0,
  margin: 0,
});

const LOG_LEVEL_COLORS: Record<LogEntry['level'], string> = {
  info: '#343741',
  warn: '#b95d00',
  error: '#bd271e',
};

const LOG_LEVEL_BG: Record<LogEntry['level'], string> = {
  info: 'transparent',
  warn: '#fff9e8',
  error: '#fff9f8',
};

interface EditorFormState {
  name: string;
  script_code: string;
}

const MAX_UNDO_STACK = 20;

export const MiniAppEditor: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);

  const { apiClient, history, coreStart, depsStart, agentBuilder } = useMiniAppsContext();
  const { confirmation, onNavigate, confirmNavigation, cancelNavigation } = useNavigateConfirmation(
    coreStart.application
  );
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditorFormState>({
    name: '',
    script_code: DEFAULT_SCRIPT,
  });
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [savedForm, setSavedForm] = useState<EditorFormState>({
    name: '',
    script_code: DEFAULT_SCRIPT,
  });

  // Draft storage
  const { loadDraft, saveDraft, discardDraft } = useDraftStorage(id);

  // Preview state
  const [previewState, setPreviewState] = useState<RuntimeState>('idle');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLogs, setPreviewLogs] = useState<LogEntry[]>([]);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const bridgeRef = useRef<ScriptPanelBridge | null>(null);
  const panelSizeRef = useRef<PanelSize>({ width: 0, height: 0 });
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Version history
  const [versions, setVersions] = useState<MiniAppVersion[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showSaveMessageModal, setShowSaveMessageModal] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Undo stack for agent code changes
  const [agentUndoStack, setAgentUndoStack] = useState<string[]>([]);

  const pendingAgentRunRef = useRef(false);

  // Saved object ID for agent builder integration.
  // In edit mode this is the URL param; in create mode it gets set after auto-creating.
  const [miniAppId, setMiniAppId] = useState<string | undefined>(id);

  const handleServerUpdate = useCallback((scriptCode: string, serverName: string) => {
    setForm((prev) => {
      if (prev.script_code === scriptCode && prev.name === serverName) return prev;
      setAgentUndoStack((stack) => {
        const next = [...stack, prev.script_code];
        return next.length > MAX_UNDO_STACK ? next.slice(-MAX_UNDO_STACK) : next;
      });
      pendingAgentRunRef.current = true;
      return { name: serverName, script_code: scriptCode };
    });
  }, []);

  const handleUndoAgentChange = useCallback(() => {
    setAgentUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const previous = stack[stack.length - 1];
      setForm((prev) => ({ ...prev, script_code: previous }));
      return stack.slice(0, -1);
    });
  }, []);

  // Poll the saved object for changes made by server-side agent tools
  const { markClientWrite, resetLastKnown } = usePollMiniApp({
    apiClient,
    id: miniAppId,
    enabled: !!agentBuilder && !!miniAppId,
    onServerUpdate: handleServerUpdate,
  });

  // Wire up agent builder with screen context (tools are server-side)
  useAgentBuilder({
    agentBuilder,
    miniAppId,
    name: form.name,
    scriptCode: form.script_code,
    runtimeState: previewState,
    runtimeError: previewError,
  });

  useEffect(() => {
    const init = async () => {
      let serverForm: EditorFormState | null = null;

      if (isEditing && id) {
        try {
          setLoading(true);
          const miniApp = await apiClient.get(id);
          serverForm = { name: miniApp.name, script_code: miniApp.script_code };
          setSavedForm(serverForm);
          setForm(serverForm);
          setVersions(miniApp.versions ?? []);
          setMiniAppId(id);
          resetLastKnown(miniApp.updated_at);
        } catch (error) {
          coreStart.notifications.toasts.addError(error as Error, {
            title: i18n.translate('miniApps.editor.loadError', {
              defaultMessage: 'Failed to load mini app',
            }),
          });
          history.push('/');
          return;
        } finally {
          setLoading(false);
        }
      }

      // Check for a draft and restore it if it differs from server version
      const draft = loadDraft();
      if (draft) {
        const base = serverForm ?? { name: '', script_code: DEFAULT_SCRIPT };
        const draftDiffers = draft.name !== base.name || draft.script_code !== base.script_code;
        if (draftDiffers) {
          setForm({ name: draft.name, script_code: draft.script_code });
          coreStart.notifications.toasts.addInfo(
            i18n.translate('miniApps.editor.draftRestored', {
              defaultMessage: 'Unsaved draft restored. Use "Discard draft" to revert.',
            })
          );
        } else {
          discardDraft();
        }
      }

      // For create mode: auto-create a draft saved object so server-side
      // agent tools have an ID to work with
      if (!isEditing && agentBuilder) {
        try {
          const created = await apiClient.create({
            name: 'Untitled Mini App',
            script_code: DEFAULT_SCRIPT,
          });
          setMiniAppId(created.id);
          resetLastKnown(created.updated_at);
        } catch {
          // Non-critical: agent tools won't work but manual editing is fine
        }
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditing]);

  // Auto-save draft on form changes
  useEffect(() => {
    if (!loading) {
      saveDraft(form.name, form.script_code);
    }
  }, [form.name, form.script_code, loading, saveDraft]);

  const isDraftDirty =
    form.name !== savedForm.name || form.script_code !== savedForm.script_code;

  const handleDiscardDraft = useCallback(() => {
    discardDraft();
    setForm(savedForm);
  }, [discardDraft, savedForm]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, name: e.target.value }));
    setErrors((prev) => ({ ...prev, name: undefined }));
  }, []);

  const handleCodeChange = useCallback((value: string) => {
    setForm((prev) => ({ ...prev, script_code: value }));
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: { name?: string } = {};

    if (!form.name.trim()) {
      newErrors.name = i18n.translate('miniApps.editor.nameRequired', {
        defaultMessage: 'Name is required',
      });
    } else if (form.name.length > 255) {
      newErrors.name = i18n.translate('miniApps.editor.nameTooLong', {
        defaultMessage: 'Name must be 255 characters or less',
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form.name]);

  const doSave = useCallback(
    async (versionMessage?: string) => {
      if (!validate()) return;

      try {
        setSaving(true);
        markClientWrite();
        let savedApp: MiniApp;

        // If we auto-created a draft saved object, update it instead of creating new
        const effectiveId = isEditing ? id : miniAppId;

        if (effectiveId) {
          savedApp = await apiClient.update(effectiveId, {
            name: form.name,
            script_code: form.script_code,
            version_message: versionMessage || undefined,
          });
          setVersions(savedApp.versions ?? []);
          coreStart.notifications.toasts.addSuccess(
            i18n.translate('miniApps.editor.updateSuccess', {
              defaultMessage: 'Mini app updated successfully',
            })
          );
        } else {
          savedApp = await apiClient.create({
            name: form.name,
            script_code: form.script_code,
          });
          coreStart.notifications.toasts.addSuccess(
            i18n.translate('miniApps.editor.createSuccess', {
              defaultMessage: 'Mini app created successfully',
            })
          );
        }

        discardDraft();
        setSavedForm({ name: form.name, script_code: form.script_code });
        history.push(`/run/${savedApp.id}`);
      } catch (error) {
        coreStart.notifications.toasts.addError(error as Error, {
          title: i18n.translate('miniApps.editor.saveError', {
            defaultMessage: 'Failed to save mini app',
          }),
        });
      } finally {
        setSaving(false);
      }
    },
    [
      validate,
      isEditing,
      id,
      miniAppId,
      apiClient,
      form,
      coreStart.notifications.toasts,
      history,
      discardDraft,
      markClientWrite,
    ]
  );

  const handleSave = useCallback(async () => {
    if (isEditing) {
      setShowSaveMessageModal(true);
    } else {
      doSave();
    }
  }, [isEditing, doSave]);

  const handleSaveWithMessage = useCallback(() => {
    setShowSaveMessageModal(false);
    doSave(saveMessage);
    setSaveMessage('');
  }, [doSave, saveMessage]);

  const handleCancelSaveMessage = useCallback(() => {
    setShowSaveMessageModal(false);
    setSaveMessage('');
  }, []);

  const handleRestoreVersion = useCallback((version: MiniAppVersion) => {
    setForm((prev) => ({ ...prev, script_code: version.script_code }));
    setShowVersionHistory(false);
  }, []);

  const handleCancel = useCallback(() => {
    history.push('/');
  }, [history]);

  const handleSaveAndRun = useCallback(async () => {
    await handleSave();
  }, [handleSave]);

  // --- Preview bridge helpers ---

  const getPanelSize = useCallback((): PanelSize => {
    if (previewContainerRef.current) {
      const rect = previewContainerRef.current.getBoundingClientRect();
      panelSizeRef.current = { width: rect.width, height: rect.height };
    }
    return panelSizeRef.current;
  }, []);

  const destroyBridge = useCallback(() => {
    if (bridgeRef.current) {
      bridgeRef.current.destroy();
      bridgeRef.current = null;
    }
  }, []);

  const runPreview = useCallback(() => {
    if (!previewContainerRef.current || !form.script_code.trim()) return;

    destroyBridge();
    setPreviewError(null);
    setPreviewLogs([]);
    setPreviewState('loading');

    const esqlExecutor = createEsqlExecutor({
      deps: { data: depsStart.data, expressions: depsStart.expressions },
      getContext: () => ({
        timeRange: depsStart.data.query.timefilter.timefilter.getTime(),
      }),
    });

    const capabilities = createPanelCapabilities({
      esqlExecutor,
      getPanelSize,
      setContent: () => {},
      setError: (message: string) => setPreviewError(message),
      onLog: (entry: LogEntry) => setPreviewLogs((prev) => [...prev, entry]),
      onNavigate,
    });

    const bridge = createScriptPanelBridge({
      container: previewContainerRef.current,
      scriptCode: form.script_code,
      cspNonce: getKibanaCspNonce(),
      handlers: capabilities.handlers,
      onStateChange: (state: RuntimeState) => setPreviewState(state),
      onError: (err: Error) => {
        setPreviewError(err.message);
        setPreviewState('error');
      },
      preludeScripts: PREACT_PRELUDE_SCRIPTS,
    });

    bridgeRef.current = bridge;
    bridge.start().catch((err: Error) => {
      setPreviewError(err.message);
      setPreviewState('error');
    });
  }, [
    form.script_code,
    depsStart.data,
    depsStart.expressions,
    getPanelSize,
    destroyBridge,
    onNavigate,
  ]);

  // Auto-run preview after agent code updates
  useEffect(() => {
    if (pendingAgentRunRef.current) {
      pendingAgentRunRef.current = false;
      runPreview();
    }
  }, [form.script_code, runPreview]);

  // Resize observer for the preview container
  useEffect(() => {
    if (!previewContainerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      const size = getPanelSize();
      if (bridgeRef.current) {
        bridgeRef.current.sendEvent('resize', size);
      }
    });

    resizeObserver.observe(previewContainerRef.current);
    return () => resizeObserver.disconnect();
  }, [getPanelSize]);

  // Cleanup bridge on unmount
  useEffect(() => destroyBridge, [destroyBridge]);

  // Keyboard shortcut: Cmd/Ctrl+Enter to run preview
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        runPreview();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [runPreview]);

  // Auto-scroll console to bottom when new logs arrive
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [previewLogs]);

  const clearLogs = useCallback(() => setPreviewLogs([]), []);

  if (loading) {
    return (
      <EuiPageTemplate.EmptyPrompt>
        <EuiLoadingSpinner size="xl" />
      </EuiPageTemplate.EmptyPrompt>
    );
  }

  const pageTitle = isEditing
    ? i18n.translate('miniApps.editor.editTitle', { defaultMessage: 'Edit mini app' })
    : i18n.translate('miniApps.editor.createTitle', { defaultMessage: 'Create mini app' });

  return (
    <>
      <EuiPageTemplate.Header
        pageTitle={pageTitle}
        rightSideItems={[
          <EuiFlexGroup key="actions" gutterSize="s" responsive={false} alignItems="center">
            {isDraftDirty && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="warning">
                  <FormattedMessage
                    id="miniApps.editor.draftBadge"
                    defaultMessage="Unsaved changes"
                  />
                </EuiBadge>
              </EuiFlexItem>
            )}
            {isDraftDirty && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={handleDiscardDraft}
                  iconType="cross"
                  color="danger"
                  size="s"
                >
                  <FormattedMessage
                    id="miniApps.editor.discardDraftButton"
                    defaultMessage="Discard draft"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            {agentUndoStack.length > 0 && (
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={i18n.translate('miniApps.editor.undoAgentTooltip', {
                    defaultMessage: 'Undo the last AI agent code change',
                  })}
                >
                  <EuiButton
                    onClick={handleUndoAgentChange}
                    iconType="editorUndo"
                    color="warning"
                    size="s"
                    data-test-subj="miniAppUndoAgentButton"
                  >
                    <FormattedMessage
                      id="miniApps.editor.undoAgentButton"
                      defaultMessage="Undo AI change"
                    />
                    <EuiBadge color="warning" css={css({ marginLeft: 4 })}>
                      {agentUndoStack.length}
                    </EuiBadge>
                  </EuiButton>
                </EuiToolTip>
              </EuiFlexItem>
            )}
            {isEditing && versions.length > 0 && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={() => setShowVersionHistory(true)}
                  iconType="clock"
                  size="s"
                >
                  <FormattedMessage
                    id="miniApps.editor.versionHistoryButton"
                    defaultMessage="History ({count})"
                    values={{ count: versions.length }}
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={handleCancel} disabled={saving}>
                <FormattedMessage id="miniApps.editor.cancelButton" defaultMessage="Cancel" />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton fill onClick={handleSaveAndRun} isLoading={saving} iconType="play">
                <FormattedMessage
                  id="miniApps.editor.saveAndRunButton"
                  defaultMessage="Save & Run"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>,
        ]}
      />
      <EuiPageTemplate.Section grow paddingSize="s" contentProps={{ css: sectionContentCss }}>
        <EuiForm component="form" css={css({ flexShrink: 0 })}>
          <EuiFormRow
            label={i18n.translate('miniApps.editor.nameLabel', { defaultMessage: 'Name' })}
            error={errors.name}
            isInvalid={Boolean(errors.name)}
            fullWidth
          >
            <EuiFieldText
              value={form.name}
              onChange={handleNameChange}
              placeholder={i18n.translate('miniApps.editor.namePlaceholder', {
                defaultMessage: 'My Mini App',
              })}
              isInvalid={Boolean(errors.name)}
              fullWidth
              data-test-subj="miniAppNameInput"
            />
          </EuiFormRow>
        </EuiForm>

        <EuiSpacer size="s" />

        <EuiResizableContainer direction="horizontal" css={resizableContainerCss}>
          {(EuiResizablePanel, EuiResizableButton) => (
            <>
              <EuiResizablePanel
                initialSize={50}
                minSize="250px"
                paddingSize="none"
                scrollable={false}
              >
                <div css={css({ height: '100%', overflow: 'hidden' })}>
                  <CodeEditor
                    languageId="javascript"
                    value={form.script_code}
                    onChange={handleCodeChange}
                    height="100%"
                    options={{
                      fontSize: 14,
                      lineNumbers: 'on',
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                      automaticLayout: true,
                      tabSize: 2,
                    }}
                    data-test-subj="miniAppCodeEditor"
                  />
                </div>
              </EuiResizablePanel>

              <EuiResizableButton indicator="border" />

              <EuiResizablePanel
                initialSize={50}
                minSize="200px"
                paddingSize="none"
                scrollable={false}
              >
                <div css={previewWrapperCss}>
                  <div css={previewToolbarCss}>
                    <EuiTitle size="xxs">
                      <h3>
                        <FormattedMessage
                          id="miniApps.editor.previewTitle"
                          defaultMessage="Preview"
                        />
                      </h3>
                    </EuiTitle>
                    <EuiButtonIcon
                      iconType="playFilled"
                      onClick={runPreview}
                      aria-label={i18n.translate('miniApps.editor.runPreviewAriaLabel', {
                        defaultMessage: 'Run preview',
                      })}
                      display="base"
                      size="s"
                      color="success"
                      isDisabled={!form.script_code.trim()}
                      data-test-subj="miniAppRunPreviewButton"
                    />
                    <span css={css({ fontSize: 12, color: '#69707d' })}>
                      {previewState === 'idle' && (
                        <FormattedMessage
                          id="miniApps.editor.previewHint"
                          defaultMessage="Press {shortcut} or click play"
                          values={{
                            shortcut: navigator.platform?.includes('Mac') ? '⌘↵' : 'Ctrl+↵',
                          }}
                        />
                      )}
                      {previewState === 'loading' && (
                        <FormattedMessage
                          id="miniApps.editor.previewLoading"
                          defaultMessage="Loading..."
                        />
                      )}
                      {previewState === 'running' && (
                        <FormattedMessage
                          id="miniApps.editor.previewRunning"
                          defaultMessage="Running"
                        />
                      )}
                      {previewState === 'error' && (
                        <FormattedMessage
                          id="miniApps.editor.previewError"
                          defaultMessage="Error"
                        />
                      )}
                    </span>
                  </div>

                  {previewError && (
                    <EuiCallOut
                      color="danger"
                      size="s"
                      iconType="error"
                      title={previewError}
                      css={css({ flexShrink: 0 })}
                    />
                  )}

                  <div css={css({ flex: '1 1 0', minHeight: 0 })}>
                    <EuiResizableContainer direction="vertical" style={{ height: '100%' }}>
                      {(EuiResizablePanel2, EuiResizableButton2) => (
                        <>
                          <EuiResizablePanel2
                            initialSize={70}
                            minSize="60px"
                            paddingSize="none"
                            scrollable={false}
                          >
                            <div
                              ref={previewContainerRef}
                              css={css({
                                width: '100%',
                                height: '100%',
                                position: 'relative',
                                overflow: 'hidden',
                              })}
                              data-test-subj="miniAppPreviewContainer"
                            />
                          </EuiResizablePanel2>

                          <EuiResizableButton2 indicator="border" />

                          <EuiResizablePanel2
                            initialSize={30}
                            minSize="40px"
                            paddingSize="none"
                            scrollable={false}
                          >
                            <div
                              css={css({
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                              })}
                            >
                              <div css={consoleToolbarCss}>
                                <EuiTitle size="xxxs">
                                  <h4>
                                    <FormattedMessage
                                      id="miniApps.editor.consoleTitle"
                                      defaultMessage="Console"
                                    />
                                    {previewLogs.length > 0 && (
                                      <EuiBadge
                                        color={
                                          previewLogs.some((l) => l.level === 'error')
                                            ? 'danger'
                                            : previewLogs.some((l) => l.level === 'warn')
                                            ? 'warning'
                                            : 'default'
                                        }
                                        css={css({ marginLeft: 6 })}
                                      >
                                        {previewLogs.length}
                                      </EuiBadge>
                                    )}
                                  </h4>
                                </EuiTitle>
                                {previewLogs.length > 0 && (
                                  <EuiButtonIcon
                                    iconType="eraser"
                                    onClick={clearLogs}
                                    aria-label={i18n.translate(
                                      'miniApps.editor.clearConsoleAriaLabel',
                                      { defaultMessage: 'Clear console' }
                                    )}
                                    size="xs"
                                    color="text"
                                  />
                                )}
                              </div>
                              <div css={consoleListCss} data-test-subj="miniAppConsoleOutput">
                                {previewLogs.length === 0 ? (
                                  <div
                                    css={css({
                                      padding: 8,
                                      color: '#98a2b3',
                                      fontStyle: 'italic',
                                    })}
                                  >
                                    <FormattedMessage
                                      id="miniApps.editor.consoleEmpty"
                                      defaultMessage="No console output yet. Use console.log() or Kibana.log.info() in your code."
                                    />
                                  </div>
                                ) : (
                                  previewLogs.map((entry, idx) => (
                                    <div
                                      key={idx}
                                      css={css({
                                        padding: '2px 8px',
                                        color: LOG_LEVEL_COLORS[entry.level],
                                        backgroundColor: LOG_LEVEL_BG[entry.level],
                                        borderBottom: '1px solid #f0f0f0',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                      })}
                                    >
                                      <span
                                        css={css({
                                          fontWeight: 600,
                                          marginRight: 6,
                                          textTransform: 'uppercase',
                                          fontSize: 10,
                                          opacity: 0.7,
                                        })}
                                      >
                                        {entry.level}
                                      </span>
                                      {entry.message}
                                    </div>
                                  ))
                                )}
                                <div ref={consoleEndRef} />
                              </div>
                            </div>
                          </EuiResizablePanel2>
                        </>
                      )}
                    </EuiResizableContainer>
                  </div>
                </div>
              </EuiResizablePanel>
            </>
          )}
        </EuiResizableContainer>
      </EuiPageTemplate.Section>

      {confirmation.isVisible && (
        <EuiConfirmModal
          aria-label="Navigate away confirmation"
          title={i18n.translate('miniApps.editor.navigateConfirmTitle', {
            defaultMessage: 'Navigate away?',
          })}
          onCancel={cancelNavigation}
          onConfirm={confirmNavigation}
          cancelButtonText={i18n.translate('miniApps.editor.navigateCancel', {
            defaultMessage: 'Stay',
          })}
          confirmButtonText={i18n.translate('miniApps.editor.navigateConfirm', {
            defaultMessage: 'Navigate',
          })}
        >
          <p>
            <FormattedMessage
              id="miniApps.editor.navigateConfirmBody"
              defaultMessage="This mini app wants to navigate to:"
            />
          </p>
          <p>
            <strong>{confirmation.url}</strong>
          </p>
        </EuiConfirmModal>
      )}

      {showSaveMessageModal && (
        <EuiModal onClose={handleCancelSaveMessage} aria-label="Save mini app">
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              <FormattedMessage
                id="miniApps.editor.saveMessageTitle"
                defaultMessage="Save mini app"
              />
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiFormRow
              label={i18n.translate('miniApps.editor.saveMessageLabel', {
                defaultMessage: 'Version note (optional)',
              })}
              helpText={i18n.translate('miniApps.editor.saveMessageHelp', {
                defaultMessage: 'Describe what changed in this version',
              })}
            >
              <EuiFieldText
                value={saveMessage}
                onChange={(e) => setSaveMessage(e.target.value)}
                placeholder={i18n.translate('miniApps.editor.saveMessagePlaceholder', {
                  defaultMessage: 'e.g. Added histogram chart',
                })}
                data-test-subj="miniAppSaveMessageInput"
              />
            </EuiFormRow>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty onClick={handleCancelSaveMessage}>
              <FormattedMessage id="miniApps.editor.saveMessageCancel" defaultMessage="Cancel" />
            </EuiButtonEmpty>
            <EuiButton onClick={handleSaveWithMessage} fill isLoading={saving}>
              <FormattedMessage id="miniApps.editor.saveMessageConfirm" defaultMessage="Save" />
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}

      {showVersionHistory && (
        <EuiFlyout
          onClose={() => setShowVersionHistory(false)}
          size="s"
          aria-label="Version history"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>
                <FormattedMessage
                  id="miniApps.editor.versionHistoryTitle"
                  defaultMessage="Version history"
                />
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            {[...versions].reverse().map((version, idx) => (
              <div
                key={idx}
                css={css({
                  padding: '12px 0',
                  borderBottom: '1px solid #d3dae6',
                })}
              >
                <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
                  <EuiFlexItem>
                    <EuiText size="s">
                      <strong>{new Date(version.saved_at).toLocaleString()}</strong>
                    </EuiText>
                    {version.message && (
                      <EuiText size="xs" color="subdued">
                        {version.message}
                      </EuiText>
                    )}
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      size="s"
                      onClick={() => handleRestoreVersion(version)}
                      iconType="editorUndo"
                    >
                      <FormattedMessage
                        id="miniApps.editor.restoreVersionButton"
                        defaultMessage="Restore"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </div>
            ))}
            {versions.length === 0 && (
              <EuiText color="subdued" size="s">
                <p>
                  <FormattedMessage
                    id="miniApps.editor.noVersions"
                    defaultMessage="No previous versions yet. Versions are created each time you save."
                  />
                </p>
              </EuiText>
            )}
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
};
