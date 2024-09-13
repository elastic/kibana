/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';

import { APP_BASE_PATH, sectionsMock } from '../mocks/mocks';
import { CardsNavigation } from './cards_navigation';
import { CardsNavigationComponentProps } from './types';

const renderCardsNavigationComponent = (props: CardsNavigationComponentProps) => {
  return [render(<CardsNavigation {...props} />)];
};

describe('Cards Navigation', () => {
  describe('Component', () => {
    test('is rendered', () => {
      expect(() =>
        render(<CardsNavigation appBasePath={APP_BASE_PATH} sections={sectionsMock} />)
      ).not.toThrowError();
    });
  });

  describe('States', () => {
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

    test('it allows to disable certain apps', () => {
      renderCardsNavigationComponent({
        sections: sectionsMock,
        appBasePath: APP_BASE_PATH,
        hideLinksTo: ['pipelines'],
      });

      const dataPipelinesApp = screen.queryByTestId('app-card-pipelines');

      expect(dataPipelinesApp).toBeNull();
    });
  });

  describe('extending card navigation definition', () => {
    test('does not render a card for a definition that specifies an invalid app id', () => {
      const invalidAppId = 'some-invalid-app-id';

      renderCardsNavigationComponent({
        sections: sectionsMock,
        appBasePath: APP_BASE_PATH,
        extendedCardNavigationDefinitions: {
          [invalidAppId]: {
            icon: 'launch',
            description: 'Invalid app not part of any registered management section',
            category: 'other',
          },
        },
      });

      const invalidAppCard = screen.queryByTestId(`app-card-${invalidAppId}`);

      expect(invalidAppCard).toBeNull();
    });

    test("renders a card for a definition that specifies any key, given the skipValidation property has a value of 'true'", () => {
      const notManagementAppId = 'some-external-app';

      renderCardsNavigationComponent({
        sections: sectionsMock,
        appBasePath: APP_BASE_PATH,
        extendedCardNavigationDefinitions: {
          [notManagementAppId]: {
            icon: 'launch',
            description: 'Invalid app not part of any registered management section',
            category: 'other',
            skipValidation: true,
            title: 'Some external app',
            href: '/path-to-said-external-app',
          },
        },
      });

      const externalAppCard = screen.queryByTestId(`app-card-${notManagementAppId}`);

      expect(externalAppCard).not.toBeNull();
    });
  });
});
