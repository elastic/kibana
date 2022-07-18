/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test-jest-helpers';

import { Introduction } from './introduction';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { TutorialsCategory } from '../../../../common/constants';

const basePathMock = httpServiceMock.createBasePath();

test('render', () => {
  const component = shallowWithIntl(
    <Introduction.WrappedComponent
      description="this is a great tutorial about..."
      title="Great tutorial"
      basePath={basePathMock}
    />
  );
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

describe('props', () => {
  test('iconType', () => {
    const component = shallowWithIntl(
      <Introduction.WrappedComponent
        description="this is a great tutorial about..."
        title="Great tutorial"
        basePath={basePathMock}
        iconType="logoElastic"
      />
    );
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });

  test('exportedFieldsUrl', () => {
    const component = shallowWithIntl(
      <Introduction.WrappedComponent
        description="this is a great tutorial about..."
        title="Great tutorial"
        basePath={basePathMock}
        exportedFieldsUrl="exported_fields_url"
      />
    );
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });

  test('previewUrl', () => {
    const component = shallowWithIntl(
      <Introduction.WrappedComponent
        description="this is a great tutorial about..."
        title="Great tutorial"
        basePath={basePathMock}
        previewUrl="preview_image_url"
      />
    );
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });

  test('isBeta', () => {
    const component = shallowWithIntl(
      <Introduction.WrappedComponent
        description="this is a great tutorial about..."
        title="Great tutorial"
        basePath={basePathMock}
        isBeta={true}
      />
    );
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });

  test('Beats badge should show', () => {
    const component = shallowWithIntl(
      <Introduction.WrappedComponent
        description="this is a great tutorial about..."
        title="Great tutorial"
        basePath={basePathMock}
        isBeta={true}
        category={TutorialsCategory.METRICS}
      />
    );
    expect(component).toMatchSnapshot();
  });

  test('Beats badge should not show', () => {
    const component = shallowWithIntl(
      <Introduction.WrappedComponent
        description="this is a great tutorial about..."
        title="Great tutorial"
        basePath={basePathMock}
        isBeta={true}
        category={TutorialsCategory.SECURITY_SOLUTION}
      />
    );
    expect(component).toMatchSnapshot();
  });
});
