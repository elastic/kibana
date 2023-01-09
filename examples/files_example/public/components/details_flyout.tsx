/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import type { FunctionComponent } from 'react';
import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiTitle,
  EuiDescriptionList,
  EuiSpacer,
} from '@elastic/eui';
import type { FileJSON } from '@kbn/files-plugin/common';
import { css } from '@emotion/react';
import type { MyImageMetadata } from '../../common';
import { FileClients } from '../types';
import { Image } from '../imports';

interface Props {
  file: FileJSON<MyImageMetadata>;
  files: FileClients;
  onDismiss: () => void;
}

export const DetailsFlyout: FunctionComponent<Props> = ({ files, file, onDismiss }) => {
  return (
    <EuiFlyout onClose={onDismiss}>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2>{file.name}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <div
          css={css`
            display: grid;
            place-items: center;
          `}
        >
          <Image
            size="l"
            alt={file.alt ?? 'unknown'}
            src={files.example.getDownloadHref(file)}
            meta={file.meta}
          />
        </div>
        <EuiSpacer size="xl" />
        <EuiDescriptionList
          type="column"
          align="center"
          textStyle="reverse"
          listItems={[
            {
              title: 'Name',
              description: file.name,
            },
            {
              title: 'Extension',
              description: file.extension ?? 'unknown',
            },
            {
              title: 'Size (bytes)',
              description: file.size ?? 'unknown',
            },
            {
              title: 'Status',
              description: file.status ?? 'unknown',
            },
            {
              title: 'Created at',
              description: moment(file.created).toLocaleString(),
            },
            {
              title: 'Last updated',
              description: moment(file.updated).fromNow(),
            },
            {
              title: 'Custom meta',
              description: (
                <pre>{file.meta ? JSON.stringify(file.meta, null, 2) : '<no custom metadata>'}</pre>
              ),
            },
          ]}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="download"
              href={files.example.getDownloadHref(file)}
              download={file.name}
            >
              Download
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onDismiss}>
              Close
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
