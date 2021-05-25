/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { registerTestBed, TestBed } from '@kbn/test/jest';

import { FieldEditor } from '../../public/components/field_editor/field_editor';
import {
  FieldEditorFlyoutContent,
  Props,
} from '../../public/components/field_editor_flyout_content';
import { WithFieldEditorDependencies, getCommonActions, noop, docLinks } from './helpers';

const defaultProps: Props = {
  onSave: noop,
  onCancel: noop,
  docLinks,
  FieldEditor,
  indexPattern: { fields: [] } as any,
  uiSettings: {} as any,
  fieldFormats: {} as any,
  fieldFormatEditors: {} as any,
  fieldTypeToProcess: 'runtime',
  runtimeFieldValidator: () => Promise.resolve(null),
  isSavingField: false,
};

export const setup = (props?: Partial<Props>) => {
  const testBed = registerTestBed(WithFieldEditorDependencies(FieldEditorFlyoutContent), {
    memoryRouter: {
      wrapComponent: false,
    },
  })({ ...defaultProps, ...props }) as TestBed;

  const actions = {
    ...getCommonActions(testBed),
  };

  return { ...testBed, actions };
};
