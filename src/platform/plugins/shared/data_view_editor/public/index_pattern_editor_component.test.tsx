/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public';

import { DataViewEditorPlugin } from './plugin';

const createDataViewsMock = (): DataViewsServicePublic => {
  const dataViews = dataPluginMock.createStartContract().dataViews as DataViewsServicePublic;

  return Object.assign(dataViews, {
    getIdsWithTitle: jest.fn().mockResolvedValue([]),
    getRollupsEnabled: jest.fn().mockReturnValue(false),
    getCanSaveSync: jest.fn().mockReturnValue(true),
    getIndices: jest.fn().mockResolvedValue([]),
    getFieldsForWildcard: jest.fn().mockResolvedValue([]),
  });
};

describe('DataViewEditorPlugin IndexPatternEditorComponent', () => {
  const setup = () => {
    const { IndexPatternEditorComponent } = new DataViewEditorPlugin().start(
      coreMock.createStart(),
      {
        data: dataPluginMock.createStartContract(),
        dataViews: createDataViewsMock(),
      }
    );

    return IndexPatternEditorComponent;
  };

  // The management page re-renders the editor with new callbacks while the user is editing, e.g. when
  // the field list refresh that follows a save finishes. That must not remount the form and reset it.
  it('preserves unsaved input when the parent re-renders with new props', async () => {
    const user = userEvent.setup();
    const IndexPatternEditorComponent = setup();

    // the wrapper option keeps the provider across `rerender`, otherwise the tree would remount
    const { rerender } = render(
      <IndexPatternEditorComponent onSave={jest.fn()} onCancel={jest.fn()} />,
      { wrapper: I18nProvider }
    );

    const titleInput = await screen.findByTestId('createIndexPatternTitleInput');
    await user.type(titleInput, 'logstash');
    // the field appends a wildcard to what is typed
    const { value: typedValue } = titleInput as HTMLInputElement;
    expect(typedValue).toContain('logstash');

    rerender(<IndexPatternEditorComponent onSave={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.getByTestId('createIndexPatternTitleInput')).toBe(titleInput);
    expect(screen.getByTestId('createIndexPatternTitleInput')).toHaveValue(typedValue);
  });
});
