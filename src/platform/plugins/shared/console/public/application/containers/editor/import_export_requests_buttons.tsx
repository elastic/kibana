/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useRef, useState } from 'react';
import { css } from '@emotion/react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { downloadFileAs } from '@kbn/share-plugin/public';

import type { ConsoleTourStepProps } from '../../components';
import { ConsoleTourStep } from '../../components';
import { useServicesContext } from '../../contexts';
import { ImportConfirmModal } from '../main/import_confirm_modal';
import { EXPORT_FILE_NAME } from '../main/constants';
import { MAIN_PANEL_LABELS } from '../main/i18n';

// 2MB limit (2 * 1024 * 1024 bytes)
const MAX_FILE_UPLOAD_SIZE = 2 * 1024 * 1024;

interface Props {
  exportContent: string;
  tourStepProps?: ConsoleTourStepProps;
}

export const ImportExportRequestsButtons = ({ exportContent, tourStepProps }: Props) => {
  const {
    services: { notifications },
  } = useServicesContext();
  const { toasts } = notifications;
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileContentToImport, setFileContentToImport] = useState<string | null>(null);

  const onImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    const file = files && files[0];
    // Clear the input value so that a file can be imported again
    event.target.value = '';

    if (!file) return;

    if (file.size > MAX_FILE_UPLOAD_SIZE) {
      toasts.addWarning(
        i18n.translate('console.notification.error.fileTooBigMessage', {
          defaultMessage: `File size exceeds the 2MB limit.`,
        })
      );
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      toasts.addWarning(
        i18n.translate('console.notification.error.failedToReadFile', {
          defaultMessage: `Failed to read the file you selected.`,
        })
      );
    };

    reader.onload = (e) => {
      const fileContent = e?.target?.result;

      if (fileContent) {
        setFileContentToImport(fileContent as string);
      } else {
        toasts.addWarning(
          i18n.translate('console.notification.error.fileImportNoContent', {
            defaultMessage: `The file you selected doesn't appear to have any content. Please select a different file.`,
          })
        );
      }
    };

    reader.readAsText(file);
  };

  const content = (
    <>
      <EuiFlexGroup responsive={false} gutterSize="s" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiToolTip content={MAIN_PANEL_LABELS.exportButtonTooltip}>
            <EuiButtonEmpty
              iconType="upload"
              disabled={exportContent === ''}
              onClick={() =>
                downloadFileAs(EXPORT_FILE_NAME, {
                  content: exportContent,
                  type: 'text/plain',
                })
              }
              size="xs"
              data-test-subj="consoleExportButton"
              aria-label={MAIN_PANEL_LABELS.exportButtonTooltip}
            >
              {MAIN_PANEL_LABELS.exportButton}
            </EuiButtonEmpty>
          </EuiToolTip>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiToolTip content={MAIN_PANEL_LABELS.importButtonTooltip}>
            <EuiButtonEmpty
              iconType="download"
              onClick={() => importFileInputRef.current?.click()}
              size="xs"
              data-test-subj="consoleImportButton"
              aria-label={MAIN_PANEL_LABELS.importButtonTooltip}
            >
              {MAIN_PANEL_LABELS.importButton}
            </EuiButtonEmpty>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>

      <input
        ref={importFileInputRef}
        type="file"
        accept="text/*"
        multiple={false}
        name="consoleSnippets"
        css={css`
          opacity: 0;
          position: absolute;
          left: -9999px;
          width: 1px;
          height: 1px;
        `}
        onChange={onImportFileChange}
      />
    </>
  );

  return (
    <>
      {tourStepProps ? (
        <ConsoleTourStep tourStepProps={tourStepProps}>{content}</ConsoleTourStep>
      ) : (
        content
      )}

      {fileContentToImport && (
        // todo open in a new tab with name of file
        <ImportConfirmModal
          onClose={() => setFileContentToImport(null)}
          fileContent={fileContentToImport}
        />
      )}
    </>
  );
};
