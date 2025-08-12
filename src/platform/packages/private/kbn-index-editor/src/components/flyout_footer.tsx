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
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { STATUS, useFileUploadContext } from '@kbn/file-upload';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { type FC } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { KibanaContextExtra } from '../types';

export interface FlyoutFooterProps {
  onClose: () => void;
}

export const FlyoutFooter: FC<FlyoutFooterProps> = ({ onClose }) => {
  const {
    services: { indexUpdateService, notifications },
  } = useKibana<KibanaContextExtra>();

  const isSaving = useObservable(indexUpdateService.isSaving$, false);
  const isIndexCreated = useObservable(
    indexUpdateService.indexCreated$,
    indexUpdateService.isIndexCreated()
  );
  const hasUnsavedChanges = useObservable(indexUpdateService.hasUnsavedChanges$, false);

  const { uploadStatus, onImportClick, canImport } = useFileUploadContext();

  const createIndex = async () => {
    if (isIndexCreated) {
      indexUpdateService.flush();
      return;
    }

    try {
      await indexUpdateService.createIndex();
      onClose();
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: i18n.translate('indexEditor.saveIndex.ErrorTitle', {
          defaultMessage: 'An error occurred while saving the index',
        }),
      });
    }
  };

  const isSaveButtonVisible =
    (!canImport && !isIndexCreated && !isSaving) || (isIndexCreated && hasUnsavedChanges);

  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
            <FormattedMessage
              id="xpack.dataVisualizer.file.uploadView.closeButton"
              defaultMessage="Close"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={true} />
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            {isSaveButtonVisible ? (
              <EuiFlexItem grow={false}>
                <EuiButton onClick={createIndex}>
                  <FormattedMessage
                    id="indexEditor.flyout.footer.primaryButtonLabel.saveIndex"
                    defaultMessage="Save changes"
                  />
                </EuiButton>
              </EuiFlexItem>
            ) : null}

            {uploadStatus.overallImportStatus === STATUS.NOT_STARTED && canImport ? (
              <EuiFlexItem grow={false}>
                <EuiButton onClick={onImportClick}>
                  <FormattedMessage
                    id="indexEditor.flyout.footer.importButton"
                    defaultMessage="Import"
                  />
                </EuiButton>
              </EuiFlexItem>
            ) : null}

            {uploadStatus.overallImportStatus === STATUS.STARTED ? (
              <EuiFlexGroup gutterSize="none" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="m" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButtonEmpty disabled>
                    <FormattedMessage
                      id="indexEditor.flyout.footer.importingButton"
                      defaultMessage="Importing..."
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : null}

            {isSaving ? (
              <EuiFlexGroup gutterSize="none" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="m" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButtonEmpty onClick={() => {}} disabled={true}>
                    <FormattedMessage
                      id="indexEditor.flyout.footer.primaryButtonLabel.saving"
                      defaultMessage="Saving..."
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
