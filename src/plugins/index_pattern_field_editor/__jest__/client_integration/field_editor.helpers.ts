/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { registerTestBed, TestBed } from '@kbn/test/jest';

import { FieldEditor, Props } from '../../public/components/field_editor/field_editor';
import { WithFieldEditorDependencies } from './helpers';

const defaultProps: Props = {
  onChange: jest.fn(),
  links: {
    runtimePainless: 'https://elastic.co',
  },
  ctx: {
    existingConcreteFields: [],
    namesNotAllowed: [],
    fieldTypeToProcess: 'runtime',
  },
  indexPattern: { fields: [] } as any,
  fieldFormatEditors: {
    getAll: () => [],
    getById: () => undefined,
  },
  fieldFormats: {} as any,
  uiSettings: {} as any,
  syntaxError: {
    error: null,
    clear: () => {},
  },
};

export const setup = (props?: Partial<Props>) => {
  const testBed = registerTestBed(WithFieldEditorDependencies(FieldEditor), {
    memoryRouter: {
      wrapComponent: false,
    },
  })({ ...defaultProps, ...props }) as TestBed;

  return testBed;
};
