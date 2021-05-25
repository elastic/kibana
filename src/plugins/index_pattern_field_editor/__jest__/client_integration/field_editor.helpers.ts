/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { registerTestBed, TestBed } from '@kbn/test/jest';

import { Context } from '../../public/components/field_editor_context';
import { FieldEditor, Props } from '../../public/components/field_editor/field_editor';
import { WithFieldEditorDependencies, getCommonActions } from './helpers';

export const defaultProps: Props = {
  onChange: jest.fn(),
  syntaxError: {
    error: null,
    clear: () => {},
  },
};

export type FieldEditorTestBed = TestBed & { actions: ReturnType<typeof getCommonActions> };

export const setup = (props?: Partial<Props>, deps?: Partial<Context>) => {
  const testBed = registerTestBed(WithFieldEditorDependencies(FieldEditor, deps), {
    memoryRouter: {
      wrapComponent: false,
    },
  })({ ...defaultProps, ...props }) as TestBed;

  const actions = {
    ...getCommonActions(testBed),
  };

  return { ...testBed, actions };
};
