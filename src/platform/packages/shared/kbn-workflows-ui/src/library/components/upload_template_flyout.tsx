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
  EuiCallOut,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { parseTemplateYaml, TemplateParseError } from '@kbn/workflows-library';

export interface UploadTemplateFlyoutProps {
  onClose: () => void;
  /** Called with the raw YAML of a successfully parsed template. */
  onUploaded: (rawYaml: string) => void;
}

interface ParsedFile {
  raw: string;
  name: string;
}

// Guard against pathological uploads: templates are small YAML documents, and
// the install route caps the body at 512KB too.
const MAX_FILE_BYTES = 512 * 1024;

/**
 * Flyout for the catalog's "Create workflow from file" flow: pick a template
 * YAML file, validate it client-side (metadata only, via `parseTemplateYaml`),
 * and hand the raw YAML back so the host can open the setup/install page. No
 * upload to the server happens here — the file is processed in the browser.
 */
export const UploadTemplateFlyout = React.memo<UploadTemplateFlyoutProps>(
  ({ onClose, onUploaded }) => {
    const titleId = useGeneratedHtmlId();
    const [error, setError] = useState<string | undefined>();
    const [parsed, setParsed] = useState<ParsedFile | undefined>();
    const [isReading, setIsReading] = useState(false);

    const handleFileChange = useCallback((files: FileList | null) => {
      setError(undefined);
      setParsed(undefined);

      const file = files?.[0];
      if (!file) return;

      if (file.size > MAX_FILE_BYTES) {
        setError(
          i18n.translate('workflows.library.upload.tooLargeError', {
            defaultMessage: 'The file is too large (limit {limit} KB).',
            values: { limit: Math.floor(MAX_FILE_BYTES / 1024) },
          })
        );
        return;
      }

      setIsReading(true);
      file
        .text()
        .then((raw) => {
          // Lenient matches the server's install route so a file accepted here
          // isn't rejected at install (and vice versa).
          const template = parseTemplateYaml(raw, { lenient: true });
          setParsed({ raw, name: template.metadata.name });
        })
        .catch((err) => {
          setError(
            err instanceof TemplateParseError
              ? err.message
              : i18n.translate('workflows.library.upload.readError', {
                  defaultMessage: 'The file could not be read.',
                })
          );
        })
        .finally(() => setIsReading(false));
    }, []);

    const handleContinue = useCallback(() => {
      if (parsed) onUploaded(parsed.raw);
    }, [parsed, onUploaded]);

    return (
      <EuiFlyout
        onClose={onClose}
        size="m"
        aria-labelledby={titleId}
        data-test-subj="workflowLibraryUploadFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={titleId}>
              {i18n.translate('workflows.library.upload.title', {
                defaultMessage: 'Install template from file',
              })}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('workflows.library.upload.description', {
                defaultMessage:
                  'Upload a workflow template YAML file. It is validated in your browser and never uploaded until you install it.',
              })}
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFormRow
            fullWidth
            label={i18n.translate('workflows.library.upload.filePickerLabel', {
              defaultMessage: 'Template file',
            })}
          >
            <EuiFilePicker
              fullWidth
              initialPromptText={i18n.translate('workflows.library.upload.filePickerPrompt', {
                defaultMessage: 'Select or drag and drop a .yml file',
              })}
              accept=".yml,.yaml"
              isLoading={isReading}
              isInvalid={Boolean(error)}
              onChange={handleFileChange}
              display="large"
              data-test-subj="workflowLibraryUploadFilePicker"
            />
          </EuiFormRow>

          {error ? (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut
                announceOnMount
                color="danger"
                iconType="error"
                size="s"
                title={error}
                data-test-subj="workflowLibraryUploadError"
              />
            </>
          ) : null}

          {parsed ? (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut
                announceOnMount
                color="success"
                iconType="check"
                size="s"
                title={i18n.translate('workflows.library.upload.validTitle', {
                  defaultMessage: '"{name}" is ready to install',
                  values: { name: parsed.name },
                })}
                data-test-subj="workflowLibraryUploadValid"
              />
            </>
          ) : null}
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="cross"
                onClick={onClose}
                flush="left"
                data-test-subj="workflowLibraryUploadCancel"
              >
                {i18n.translate('workflows.library.upload.cancel', { defaultMessage: 'Cancel' })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={handleContinue}
                disabled={!parsed}
                data-test-subj="workflowLibraryUploadContinue"
              >
                {i18n.translate('workflows.library.upload.continue', {
                  defaultMessage: 'Continue',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
);
UploadTemplateFlyout.displayName = 'UploadTemplateFlyout';
