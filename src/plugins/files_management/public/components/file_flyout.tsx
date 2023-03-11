/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiDescriptionList,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiSpacer,
  EuiFlyoutFooter,
  EuiButtonEmpty,
  EuiHorizontalRule,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import type { FileJSON } from '@kbn/files-plugin/common';
import type { FunctionComponent } from 'react';
import { FileImage as Image } from '@kbn/shared-ux-file-image';
import React from 'react';
import { i18nTexts } from '../i18n_texts';
import { useFilesManagementContext } from '../context';

interface Props {
  file: FileJSON;
  onClose: () => void;
}

export const FileFlyout: FunctionComponent<Props> = ({ onClose, file }) => {
  const { filesClient } = useFilesManagementContext();
  return (
    <EuiFlyout ownFocus onClose={onClose} size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>{file.name}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiDescriptionList
              type="column"
              listItems={[
                {
                  title: i18nTexts.filesFlyoutStatus,
                  description: (
                    <EuiHealth
                      color={
                        file.status === 'READY'
                          ? 'success'
                          : file.status === 'AWAITING_UPLOAD' || file.status === 'UPLOADING'
                          ? 'primary'
                          : 'warning'
                      }
                    >
                      {i18nTexts.filesStatus[file.status]}
                    </EuiHealth>
                  ),
                },
                {
                  title: i18nTexts.filesFlyoutSize,
                  description: numeral(file.size).format('0[.]0 b'),
                },
                {
                  title: i18nTexts.filesFlyoutExtension,
                  description: file.extension?.toUpperCase() ?? '',
                },
              ]}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiDescriptionList
              type="column"
              listItems={[
                {
                  title: i18nTexts.filesFlyoutMimeType,
                  description: file.mimeType ?? '',
                },
                {
                  title: i18nTexts.filesFlyoutCreated,
                  description: file.created,
                },
                {
                  title: i18nTexts.filesFlyoutUpdated,
                  description: file.updated,
                },
              ]}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        {file.mimeType?.startsWith('image/') && (
          <>
            <EuiSpacer size="l" />
            <EuiHorizontalRule />
            <EuiTitle size="s">
              <h3>{i18nTexts.filesFlyoutPreview}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiFlexGroup justifyContent="center" gutterSize="none">
              <Image size="xl" alt={file.alt ?? ''} src={filesClient.getDownloadHref(file)} />
            </EuiFlexGroup>
          </>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiButtonEmpty href={filesClient.getDownloadHref(file)} iconType="download">
            {i18nTexts.filesFlyoutDownload}
          </EuiButtonEmpty>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
