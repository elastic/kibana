/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { FunctionComponent } from 'react';

import { exampleFileKind } from '../../common';

import { FilePicker } from '../imports';

interface Props {
  onClose: () => void;
  onUpload: (ids: string[]) => void;
  onDone: (ids: string[]) => void;
}

export const MyFilePicker: FunctionComponent<Props> = ({ onClose, onDone, onUpload }) => {
  return (
    <FilePicker
      kind={exampleFileKind.id}
      onClose={onClose}
      onDone={(files) => onDone(files.map((f) => f.id))}
      onUpload={(n) => onUpload(n.map(({ id }) => id))}
      pageSize={50}
      uploadMeta={{ myCool: 'meta' }}
      multiple
    />
  );
};
