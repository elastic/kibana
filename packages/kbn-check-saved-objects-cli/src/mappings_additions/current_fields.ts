/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { FieldListMap } from '@kbn/core-saved-objects-base-server-internal';
import { prettyPrintAndSortKeys } from '@kbn/utils';
import { fileToJson, jsonToFile } from '../util';

const CURRENT_FIELDS_FILE_PATH = Path.resolve(__dirname, '../../current_fields.json');

export const readCurrentFields = async (): Promise<FieldListMap> => {
  return (await fileToJson(CURRENT_FIELDS_FILE_PATH, {})) as FieldListMap;
};

export const writeCurrentFields = async (fieldMap: FieldListMap) => {
  await jsonToFile(CURRENT_FIELDS_FILE_PATH, prettyPrintAndSortKeys(fieldMap) + '\n');
};
