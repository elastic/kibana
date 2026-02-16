/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPageTemplate,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useParams } from 'react-router-dom';
import { CodeEditor } from '@kbn/code-editor';
import { css } from '@emotion/react';
import type { MiniApp } from '../../common';
import { useMiniAppsContext } from '../context';

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

interface EditorFormState {
  name: string;
  script_code: string;
}

export const MiniAppEditor: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);

  const { apiClient, history, coreStart } = useMiniAppsContext();
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditorFormState>({
    name: '',
    script_code: DEFAULT_SCRIPT,
  });
  const [errors, setErrors] = useState<{ name?: string }>({});

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
      <EuiPageTemplate.Section>
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

          <EuiSpacer size="l" />

          <EuiFormRow
            label={i18n.translate('miniApps.editor.codeLabel', {
              defaultMessage: 'JavaScript Code',
            })}
            helpText={i18n.translate('miniApps.editor.codeHelpText', {
              defaultMessage:
                'Write JavaScript code that uses the Kibana API to render content and query data.',
            })}
            fullWidth
          >
            <EuiPanel
              paddingSize="none"
              css={css`
                overflow: hidden;
              `}
            >
              <CodeEditor
                languageId="javascript"
                value={form.script_code}
                onChange={handleCodeChange}
                height={500}
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
          </EuiFormRow>
        </EuiForm>
      </EuiPageTemplate.Section>
    </>
  );
};
