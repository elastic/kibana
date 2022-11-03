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
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import type { FileJSON } from '@kbn/files-plugin/common';
import type { FunctionComponent } from 'react';
import React from 'react';
import { i18nTexts } from '../i18n_texts';

interface Props {
  file: FileJSON;
  onClose: () => void;
}

export const FileFlyout: FunctionComponent<Props> = ({ onClose, file }) => {
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
                      {file.status}
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
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
