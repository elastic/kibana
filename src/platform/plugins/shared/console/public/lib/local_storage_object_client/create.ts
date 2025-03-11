/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Storage } from '../../services';
import { ObjectStorageClient } from '../../../common/types';
import { TextObject, textObjectTypeName } from '../../../common/text_object';
import { LocalObjectStorage } from './local_storage_object_client';

export const create = (storage: Storage): ObjectStorageClient => {
  return {
    text: new LocalObjectStorage<TextObject>(storage, textObjectTypeName),
  };
};
