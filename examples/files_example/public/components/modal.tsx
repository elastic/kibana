/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiModal, EuiModalHeader, EuiModalBody, EuiText } from '@elastic/eui';
import { exampleFileKind, MyImageMetadata } from '../../common';
import { FilesClient, FileUpload } from '../imports';

interface Props {
  client: FilesClient<MyImageMetadata>;
  onDismiss: () => void;
  onUploaded: () => void;
}

export const Modal: FunctionComponent<Props> = ({ onDismiss, onUploaded, client }) => {
  return (
    <EuiModal onClose={onDismiss}>
      <EuiModalHeader>
        <EuiText>
          <h2>Upload image</h2>
        </EuiText>
      </EuiModalHeader>
      <EuiModalBody>
        <FileUpload
          multiple
          kind={exampleFileKind.id}
          onDone={onUploaded}
          meta={{ custom: 'meta' }}
        />
      </EuiModalBody>
    </EuiModal>
  );
};
