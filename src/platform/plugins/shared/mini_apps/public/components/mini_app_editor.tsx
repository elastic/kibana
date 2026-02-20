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
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPageTemplate,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiPanel,
  EuiResizableContainer,
  EuiTitle,
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
import type { MiniApp } from '../../common';
import { useMiniAppsContext } from '../context';
import { useAgentBuilder } from '../hooks/use_agent_builder';

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

const previewContainerCss = css({
  width: '100%',
  height: '100%',
  position: 'relative',
  overflow: 'hidden',
  minHeight: 0,
  flex: 1,
});

const previewPanelCss = css({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
});

const editorPanelCss = css({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
});

interface EditorFormState {
  name: string;
  script_code: string;
}

export const MiniAppEditor: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);

  const { apiClient, history, coreStart, depsStart, agentBuilder } = useMiniAppsContext();
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditorFormState>({
    name: '',
    script_code: DEFAULT_SCRIPT,
  });
  const [errors, setErrors] = useState<{ name?: string }>({});

  // Preview state
  const [previewState, setPreviewState] = useState<RuntimeState>('idle');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const bridgeRef = useRef<ScriptPanelBridge | null>(null);
  const panelSizeRef = useRef<PanelSize>({ width: 0, height: 0 });

  // When the agent updates code, update the form and re-run preview
  const handleAgentUpdateCode = useCallback(
    (code: string) => {
      setForm((prev) => ({ ...prev, script_code: code }));
    },
    []
  );

  // Wire up agent builder with browser tools and screen context
  useAgentBuilder({
    agentBuilder,
    name: form.name,
    scriptCode: form.script_code,
    runtimeState: previewState,
    runtimeError: previewError,
    onUpdateCode: handleAgentUpdateCode,
  });

  useEffect(() => {
    if (isEditing && id) {
      const loadMiniApp = async () => {
        try {
          setLoading(true);
          const miniApp = await apiClient.get(id);
          setForm({
            name: miniApp.name,
            script_code: miniApp.script_code,
          });
        } catch (error) {
          coreStart.notifications.toasts.addError(error as Error, {
            title: i18n.translate('miniApps.editor.loadError', {
              defaultMessage: 'Failed to load mini app',
            }),
          });
          history.push('/');
        } finally {
          setLoading(false);
        }
      };
      loadMiniApp();
    }
  }, [id, isEditing, apiClient, coreStart.notifications.toasts, history]);

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

  const handleSave = useCallback(async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      let savedApp: MiniApp;

      if (isEditing && id) {
        savedApp = await apiClient.update(id, {
          name: form.name,
          script_code: form.script_code,
        });
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
  }, [validate, isEditing, id, apiClient, form, coreStart.notifications.toasts, history]);

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
      onLog: (_entry: LogEntry) => {},
    });

    const bridge = createScriptPanelBridge({
      container: previewContainerRef.current,
      scriptCode: form.script_code,
      cspNonce: getKibanaCspNonce(),
      handlers: capabilities.handlers,
      onStateChange: (state: RuntimeState) => setPreviewState(state),
      onLog: (_entry: LogEntry) => {},
      onError: (err: Error) => {
        setPreviewError(err.message);
        setPreviewState('error');
      },
    });

    bridgeRef.current = bridge;
    bridge.start().catch((err: Error) => {
      setPreviewError(err.message);
      setPreviewState('error');
    });
  }, [form.script_code, depsStart.data, depsStart.expressions, getPanelSize, destroyBridge]);

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
          <EuiFlexGroup key="actions" gutterSize="s" responsive={false}>
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
      <EuiPageTemplate.Section
        grow
        paddingSize="s"
        css={css({ display: 'flex', flexDirection: 'column', minHeight: 0 })}
      >
        <EuiForm component="form">
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

        <EuiSpacer size="m" />

        <EuiResizableContainer
          direction="horizontal"
          css={css({ flex: 1, minHeight: '500px' })}
        >
          {(EuiResizablePanel, EuiResizableButton) => (
            <>
              <EuiResizablePanel
                initialSize={50}
                minSize="300px"
                paddingSize="none"
                css={editorPanelCss}
              >
                <EuiPanel
                  paddingSize="none"
                  css={css({ overflow: 'hidden', height: '100%' })}
                  borderRadius="none"
                >
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
                </EuiPanel>
              </EuiResizablePanel>

              <EuiResizableButton indicator="border" />

              <EuiResizablePanel
                initialSize={50}
                minSize="200px"
                paddingSize="none"
                css={previewPanelCss}
              >
                <EuiPanel
                  css={css({ display: 'flex', flexDirection: 'column', height: '100%' })}
                  paddingSize="s"
                  borderRadius="none"
                >
                  <EuiFlexGroup
                    alignItems="center"
                    gutterSize="s"
                    responsive={false}
                    css={css({ flexShrink: 0 })}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiTitle size="xxs">
                        <h3>
                          <FormattedMessage
                            id="miniApps.editor.previewTitle"
                            defaultMessage="Preview"
                          />
                        </h3>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
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
                    </EuiFlexItem>
                    <EuiFlexItem grow>
                      <span
                        css={css({
                          fontSize: '12px',
                          color: '#69707d',
                        })}
                      >
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
                    </EuiFlexItem>
                  </EuiFlexGroup>

                  {previewError && (
                    <>
                      <EuiSpacer size="xs" />
                      <EuiCallOut
                        color="danger"
                        size="s"
                        iconType="error"
                        title={previewError}
                        css={css({ flexShrink: 0 })}
                      />
                    </>
                  )}

                  <EuiSpacer size="xs" />

                  <div
                    ref={previewContainerRef}
                    css={previewContainerCss}
                    data-test-subj="miniAppPreviewContainer"
                  />
                </EuiPanel>
              </EuiResizablePanel>
            </>
          )}
        </EuiResizableContainer>
      </EuiPageTemplate.Section>
    </>
  );
};
