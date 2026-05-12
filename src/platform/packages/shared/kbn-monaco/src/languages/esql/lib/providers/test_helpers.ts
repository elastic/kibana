/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLFieldWithMetadata, ESQLSourceResult, EsqlFieldType } from '@kbn/esql-types';
import { SOURCES_TYPES } from '@kbn/esql-types';
import { monaco } from '../../../../monaco_imports';

export const createTextModel = ({
  value,
  uri = monaco.Uri.parse('inmemory://test'),
  getWordAtPosition = jest.fn(),
  getDecorationsInRange = jest.fn().mockReturnValue([]),
}: {
  value: string;
  uri?: monaco.Uri;
  getWordAtPosition?: jest.Mock;
  getDecorationsInRange?: jest.Mock;
}) =>
  ({
    getValue: jest.fn().mockReturnValue(value),
    getValueInRange: jest.fn().mockReturnValue(value),
    getValueLength: jest.fn().mockReturnValue(value.length),
    getLineCount: jest.fn().mockReturnValue(value.split('\n').length),
    getFullModelRange: jest.fn().mockReturnValue(new monaco.Range(1, 1, 1, value.length + 1)),
    getWordAtPosition,
    getDecorationsInRange,
    isDisposed: () => false,
    uri,
  } as unknown as monaco.editor.ITextModel);

export const createDisposedTextModel = () =>
  ({
    getValue: jest.fn(),
    getValueInRange: jest.fn(),
    getValueLength: jest.fn(),
    getLineCount: jest.fn(),
    isDisposed: () => true,
  } as unknown as monaco.editor.ITextModel);

export const createIndexSource = (name: string) =>
  ({ name, hidden: false, type: SOURCES_TYPES.INDEX } as ESQLSourceResult);

export const createWiredStreamSource = (name: string) =>
  ({ name, hidden: false, type: SOURCES_TYPES.WIRED_STREAM } as ESQLSourceResult);

export const createField = (
  name: string,
  type: EsqlFieldType = 'keyword'
): ESQLFieldWithMetadata => ({
  name,
  type,
  userDefined: false,
});
