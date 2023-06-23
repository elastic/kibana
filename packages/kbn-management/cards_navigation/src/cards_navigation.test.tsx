/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';

import { coreMock } from '@kbn/core/public/mocks';

import { APP_BASE_PATH, sectionsMock } from '../mocks/mocks';
import { CardsNavigation } from './cards_navigation';
import { CardsNavigationComponent } from './cards_navigation.component';
import { CardsNavigationComponentProps } from './types';

const coreStartMock = coreMock.createStart({ basePath: '/mock/app' });

const renderCardsNavigationComponent = (props: CardsNavigationComponentProps) => {
  return [render(<CardsNavigation {...props} coreStart={coreStartMock} />)];
};

describe('ProjectSwitcher', () => {
  describe('Component', () => {
    test('is rendered', () => {
      expect(() =>
        render(<CardsNavigationComponent appBasePath={APP_BASE_PATH} sections={sectionsMock} />)
      ).not.toThrowError();
    });
  });

  describe('With providers', () => {
    beforeEach(() => {
      cleanup();
    });

    test('it renders categories and cards', () => {
      renderCardsNavigationComponent({ sections: sectionsMock, appBasePath: APP_BASE_PATH });

      const dataCategory = screen.queryByTestId('category-data');
      const dataPipelinesApp = screen.queryByTestId('app-card-pipelines');

      expect(dataCategory).not.toBeNull();
      expect(dataPipelinesApp).not.toBeNull();
    });

    test('it doesnt show empty categories', () => {
      renderCardsNavigationComponent({
        sections: [
          {
            id: 'data',
            title: 'Data',
            apps: [],
          },
        ],
        appBasePath: APP_BASE_PATH,
      });

      const dataCategory = screen.queryByTestId('category-data');

      expect(dataCategory).toBeNull();
    });
  });
});
