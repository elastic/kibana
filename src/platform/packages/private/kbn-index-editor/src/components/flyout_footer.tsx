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
import { useFileUploadContext } from '@kbn/file-upload';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { type FC } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { KibanaContextExtra } from '../types';

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

  const indexName = useObservable(indexUpdateService.indexName$, indexUpdateService.getIndexName());

  const { setExistingIndexName } = useFileUploadContext();

  const onSave = async ({ exitAfterFlush = false }) => {
    if (isIndexCreated) {
      indexUpdateService.flush({ exitAfterFlush });
      return;
    }

    try {
      await indexUpdateService.createIndex({ exitAfterFlush });
      if (!exitAfterFlush) {
        setExistingIndexName(indexName);
      }
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: i18n.translate('indexEditor.saveIndex.ErrorTitle', {
          defaultMessage: 'An error occurred while saving the index',
        }),
      });
    }
  };

  const isSaveButtonVisible = !isSaving && hasUnsavedChanges;

  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="indexEditorCloseButton"
            iconType="cross"
            onClick={onClose}
            flush="left"
          >
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
              <>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    data-test-subj="indexEditorSaveAndCloseButton"
                    onClick={() => onSave({ exitAfterFlush: true })}
                  >
                    <FormattedMessage
                      id="indexEditor.flyout.footer.primaryButtonLabel.saveAndClose"
                      defaultMessage="Save and close"
                    />
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    data-test-subj="indexEditorSaveChangesButton"
                    fill
                    onClick={() => onSave({ exitAfterFlush: false })}
                  >
                    <FormattedMessage
                      id="indexEditor.flyout.footer.primaryButtonLabel.saveIndex"
                      defaultMessage="Save"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </>
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
