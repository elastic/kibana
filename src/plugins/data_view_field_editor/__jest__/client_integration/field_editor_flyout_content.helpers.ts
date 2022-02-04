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
import {
  FieldEditorFlyoutContent,
  Props,
} from '../../public/components/field_editor_flyout_content';
import { WithFieldEditorDependencies, getCommonActions } from './helpers';

export { waitForUpdates, waitForDocumentsAndPreviewUpdate } from './helpers';

const defaultProps: Props = {
  onSave: () => {},
  onCancel: () => {},
  isSavingField: false,
};

const getActions = (testBed: TestBed) => {
  return {
    ...getCommonActions(testBed),
  };
};

export const setup = async (props?: Partial<Props>, deps?: Partial<Context>) => {
  let testBed: TestBed;

  // Setup testbed
  await act(async () => {
    testBed = await registerTestBed(WithFieldEditorDependencies(FieldEditorFlyoutContent, deps), {
      memoryRouter: {
        wrapComponent: false,
      },
    })({ ...defaultProps, ...props });
  });

  testBed!.component.update();

  return { ...testBed!, actions: getActions(testBed!) };
};
