/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiLink,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import type { KibanaContextExtra } from '../types';
import { useFileSelectorContext } from './file_drop_zone';
import { isPlaceholderColumn } from '../utils';

export const EmptyPrompt: FC = () => {
  const { onFileSelectorClick } = useFileSelectorContext();
  const {
    services: { fileUpload, indexUpdateService, notifications, indexEditorTelemetryService },
  } = useKibana<KibanaContextExtra>();

  const columns = useObservable(indexUpdateService.dataTableColumns$);

  const allowMappingsReset = useMemo(
    () =>
      indexUpdateService.isIndexCreated() &&
      indexUpdateService.userCanResetIndex &&
      columns?.some((col) => !isPlaceholderColumn(col.name)),
    [columns, indexUpdateService]
  );

  const [isResettingMappings, setIsResettingMappings] = useState(false);

  const resetIndexMappings = useCallback(async () => {
    setIsResettingMappings(true);
    try {
      await indexUpdateService.resetIndexMapping();
      indexEditorTelemetryService.trackResetIndex('success');
    } catch (error) {
      notifications.toasts.addError(error, {
        title: i18n.translate('indexEditor.emptyPrompt.resetMappingsErrorToastTitle', {
          defaultMessage: 'Error resetting index mappings',
        }),
      });
      indexEditorTelemetryService.trackResetIndex('error');
    } finally {
      setIsResettingMappings(false);
      setIsResetMappingsWarningModalOpen(false);
    }
  }, [indexEditorTelemetryService, indexUpdateService, notifications.toasts]);

  const maxFileSize = fileUpload.getMaxBytesFormatted();

  const [isResetMappingsWarningModalOpen, setIsResetMappingsWarningModalOpen] = useState(false);
  const resetMappingsModalTitleId = useGeneratedHtmlId();

  const uploading = (
    <EuiLink
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onFileSelectorClick();
      }}
      css={{
        cursor: 'pointer',
      }}
    >
      <FormattedMessage id="indexEditor.emptyPrompt.uploadingLink" defaultMessage="uploading" />
    </EuiLink>
  );

  const dragAndDrop = (
    <strong>
      <FormattedMessage
        id="indexEditor.emptyPrompt.dragAndDrop"
        defaultMessage="dragging and dropping"
      />
    </strong>
  );

  return (
    <EuiEmptyPrompt
      iconType={UploadIcon}
      body={
        <>
          <EuiText color="subdued" textAlign="center" size="s">
            <FormattedMessage
              id="indexEditor.emptyPrompt.description"
              defaultMessage="Add data to your lookup index by specifying fields and cell values manually, by {uploading}, or by {dragAndDrop} a file."
              values={{ uploading, dragAndDrop }}
            />
          </EuiText>
          <EuiSpacer size="l" />
          <EuiText color="subdued" textAlign="center" size="xs">
            <FormattedMessage
              id="indexEditor.emptyPrompt.description.supportedFormats"
              defaultMessage="Supports CSV files up to {maxFileSize}."
              values={{
                maxFileSize,
              }}
            />
          </EuiText>
          {allowMappingsReset && (
            <>
              <EuiSpacer size="l" />
              <EuiButton onClick={() => setIsResetMappingsWarningModalOpen(true)}>
                <EuiText size="xs">
                  <FormattedMessage
                    id="indexEditor.emptyPrompt.resetIndex"
                    defaultMessage="Reset index"
                  />
                </EuiText>
              </EuiButton>
            </>
          )}
          {isResetMappingsWarningModalOpen && (
            <EuiConfirmModal
              aria-labelledby={resetMappingsModalTitleId}
              title={
                <FormattedMessage
                  id="indexEditor.mappingsWarningModal.title"
                  defaultMessage="Reset index?"
                />
              }
              onCancel={() => setIsResetMappingsWarningModalOpen(false)}
              onConfirm={resetIndexMappings}
              cancelButtonText={
                <FormattedMessage
                  id="indexEditor.mappingsWarningModal.cancel"
                  defaultMessage="Cancel"
                />
              }
              confirmButtonText={
                <FormattedMessage
                  id="indexEditor.emptyPrompt.resetIndex"
                  defaultMessage="Reset index"
                />
              }
              buttonColor="danger"
              defaultFocusedButton="confirm"
              isLoading={isResettingMappings}
            >
              <p>
                <FormattedMessage
                  id="indexEditor.mappingsWarningModal.body"
                  defaultMessage="This action will permanently delete all existing fields of the lookup index and reset its configuration."
                />
              </p>
            </EuiConfirmModal>
          )}
        </>
      }
    />
  );
};

// This icon will be replaced with an EUI icon in the future. https://github.com/elastic/eui/issues/8928
const UploadIcon: FC = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="60"
      height="60"
      fill="none"
      viewBox="0 0 128 128"
    >
      <path fill={euiTheme.colors.backgroundBasePlain} d="M0 0h128v128H0z" />
      <path
        fill="#153385"
        stroke="#101C3F"
        strokeMiterlimit="10"
        d="M101.93 17.56H24.72a5.57 5.57 0 0 0-5.57 5.57V94.5a5.57 5.57 0 0 0 5.57 5.57h77.21a5.57 5.57 0 0 0 5.57-5.57V23.13a5.57 5.57 0 0 0-5.57-5.57Z"
      />
      <path
        fill="#0B64DD"
        d="M104.5 17.5H27.29a5.57 5.57 0 0 0-5.57 5.57v71.37a5.57 5.57 0 0 0 5.57 5.57h77.21a5.57 5.57 0 0 0 5.57-5.57V23.07a5.57 5.57 0 0 0-5.57-5.57Z"
      />
      <path
        stroke="#101C3F"
        strokeMiterlimit="10"
        d="M104.5 17.5H27.29a5.57 5.57 0 0 0-5.57 5.57v71.37a5.57 5.57 0 0 0 5.57 5.57h77.21a5.57 5.57 0 0 0 5.57-5.57V23.07a5.57 5.57 0 0 0-5.57-5.57ZM21.79 32.32h88.1"
      />
      <path
        fill="#fff"
        d="M41.58 23.66h-10.8a1.59 1.59 0 0 0-1.59 1.59v.84c0 .878.712 1.59 1.59 1.59h10.8a1.59 1.59 0 0 0 1.59-1.59v-.84a1.59 1.59 0 0 0-1.59-1.59Z"
      />
      <path
        fill="#153385"
        stroke="#101C3F"
        strokeMiterlimit="10"
        d="M87.29 48.82c-1.47 0-2.91.11-4.33.31-4.57-6.79-12.34-11.26-21.14-11.26-11.13 0-20.59 7.14-24.05 17.09-1.6-.39-3.27-.59-4.99-.59-11.75-.01-21.28 9.51-21.28 21.27 0 2.39.4 4.69 1.13 6.84h104.91c.11-1.06.17-2.15.17-3.24 0-16.8-13.62-30.42-30.42-30.42Z"
      />
      <path
        fill="#fff"
        stroke="#101C3F"
        strokeMiterlimit="10"
        d="M87.29 53.64c-1.47 0-2.91.11-4.33.31-4.57-6.79-12.34-11.26-21.14-11.26-11.13 0-20.59 7.14-24.05 17.09-1.6-.39-3.27-.59-4.99-.59-11.75-.01-21.28 9.52-21.28 21.27 0 2.39.4 4.69 1.13 6.84h104.91c.11-1.06.17-2.15.17-3.24 0-16.8-13.62-30.42-30.42-30.42Z"
      />
      <path
        fill="#153385"
        d="M57.74 120.82V76.48l-9.8.03 15.64-13.5h1.81v1.93L77.29 76h-9.13v44.82H57.74Z"
      />
      <path
        fill="#101C3F"
        d="M64.89 63.51v1.66l.32.3 10.81 10.05h-8.36v44.82h-9.42V75.99h-1l-7.94.03 14.47-12.5h1.12m1-1.01H63.4L46.6 77.02l10.64-.03v44.34h11.42V76.51h9.91L65.89 64.73v-2.22Z"
      />
      <path
        fill="#48EFCF"
        stroke="#101C3F"
        strokeMiterlimit="10"
        d="M59.73 76.5v44.31h11.43V76.5h9.9L65.88 63.17 50.26 76.5h9.47Z"
      />
      <path
        fill="#153385"
        d="M36.04 109.94V91.37l-7.41.03 11.88-10.27h1.25v1.44l9.08 8.44h-6.92v18.93h-7.88Z"
      />
      <path
        fill="#101C3F"
        d="M41.26 81.63v1.16l.32.3 7.98 7.42h-6.15v18.94h-6.87V90.88h-1l-5.57.02 10.72-9.26h.57m1-1.01h-1.94L27.27 91.9l8.27-.03v18.56h8.87V91.49h7.7l-9.85-9.15v-1.72.01Z"
      />
      <path
        fill="#48EFCF"
        stroke="#101C3F"
        strokeMiterlimit="10"
        d="M37.48 91.51v18.53h8.88V91.51h7.69L42.26 81.15 30.13 91.51h7.35Z"
      />
      <path
        fill="#153385"
        d="M82.61 109.94V91.37l-7.42.03 11.89-10.27h1.25v1.44l9.07 8.44h-6.92v18.93h-7.87Z"
      />
      <path
        fill="#101C3F"
        d="M87.83 81.63v1.16l.32.3 7.98 7.42h-6.15v18.94h-6.87V90.88h-1l-5.57.02 10.72-9.26h.57m1-1.01h-1.94L73.84 91.9l8.27-.03v18.56h8.87V91.49h7.7l-9.85-9.15v-1.72.01Z"
      />
      <path
        fill="#48EFCF"
        stroke="#101C3F"
        strokeMiterlimit="10"
        d="M84.05 91.51v18.53h8.87V91.51h7.7l-11.8-10.36-12.13 10.36h7.36Z"
      />
    </svg>
  );
};
