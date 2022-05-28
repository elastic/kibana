/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { act } from 'react-dom/test-utils';
import { registerTestBed, TestBed } from '@kbn/test-jest-helpers';

import { Context } from '../../public/components/field_editor_context';
import { FieldEditor, Props } from '../../public/components/field_editor/field_editor';
import { WithFieldEditorDependencies, getCommonActions } from './helpers';

export { waitForUpdates, waitForDocumentsAndPreviewUpdate } from './helpers';

export const defaultProps: Props = {
  onChange: jest.fn(),
};

export type FieldEditorTestBed = TestBed & { actions: ReturnType<typeof getCommonActions> };

export const setup = async (props?: Partial<Props>, deps?: Partial<Context>) => {
  let testBed: TestBed<string>;

  await act(async () => {
    testBed = await registerTestBed(WithFieldEditorDependencies(FieldEditor, deps), {
      memoryRouter: {
        wrapComponent: false,
      },
    })({ ...defaultProps, ...props });
  });
  testBed!.component.update();

  const actions = {
    ...getCommonActions(testBed!),
  };

  return { ...testBed!, actions };
};
