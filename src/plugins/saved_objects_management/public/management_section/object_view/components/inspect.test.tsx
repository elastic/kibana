/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ShallowWrapper } from 'enzyme';
import { shallowWithI18nProvider } from '@kbn/test-jest-helpers';
import { Inspect, InspectProps } from './inspect';
import { SavedObjectWithMetadata } from '../../../../common';

describe('Inspect component', () => {
  let defaultProps: { object: SavedObjectWithMetadata };
  const shallowRender = (overrides: Partial<SavedObjectWithMetadata> = {}) => {
    return shallowWithI18nProvider(
      <Inspect {...defaultProps} {...overrides} />
    ) as unknown as ShallowWrapper<InspectProps>;
  };
  beforeEach(() => {
    defaultProps = {
      object: {
        id: '1',
        type: 'index-pattern',
        attributes: {
          title: `MyIndexPattern*`,
        },
        meta: {
          title: `MyIndexPattern*`,
          icon: 'indexPatternApp',
          editUrl: '#/management/kibana/dataViews/dataView/1',
          inAppUrl: {
            path: '/management/kibana/dataViews/dataView/1',
            uiCapabilitiesPath: 'management.kibana.indexPatterns',
          },
        },
        references: [],
      },
    };
  });

  it('renders correctly', async () => {
    const component = shallowRender();
    await new Promise((resolve) => process.nextTick(resolve));
    component.update();
    const codeEditorComponent = component.find('CodeEditor');
    expect(codeEditorComponent).toMatchSnapshot();
  });

  it("does not include `meta` in the value that's rendered", async () => {
    const component = shallowRender();
    await new Promise((resolve) => process.nextTick(resolve));
    component.update();
    const codeEditorComponent = component.find('CodeEditor');
    // find could return nothing
    const editorValue = codeEditorComponent
      ? (codeEditorComponent.prop('value') as unknown as string)
      : '';
    // we assert against the expected object props rather than asserting that 'meta' is removed
    expect(Object.keys(JSON.parse(editorValue))).toEqual([
      'id',
      'type',
      'attributes',
      'references',
    ]);
  });
});
