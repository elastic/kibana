/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import { fireEvent, render, screen } from '@testing-library/react';
import { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';

import { AddPanelFlyout } from './add_panel_flyout';
import { core, embeddableStart, usageCollection } from '../kibana_services';
import { ContactCardEmbeddableFactory } from '../lib/test_samples';
import { Container, registerReactEmbeddableSavedObject } from '../lib';
import { getMockPresentationContainer } from '@kbn/presentation-containers/mocks';

// Mock saved objects finder component so we can call the onChoose method.
jest.mock('@kbn/saved-objects-finder-plugin/public', () => {
  return {
    SavedObjectFinder: jest
      .fn()
      .mockImplementation(
        ({
          onChoose,
        }: {
          onChoose: (id: string, type: string, name: string, so: unknown) => Promise<void>;
        }) => (
          <>
            <button
              id="soFinderAddButton"
              data-test-subj="soFinderAddButton"
              onClick={() =>
                onChoose?.(
                  'awesomeId',
                  'AWESOME_EMBEDDABLE',
                  'Awesome sauce',
                  {} as unknown as SavedObjectCommon
                )
              }
            >
              Add embeddable!
            </button>
            <button
              id="soFinderAddLegacyButton"
              data-test-subj="soFinderAddLegacyButton"
              onClick={() =>
                onChoose?.(
                  'testId',
                  'CONTACT_CARD_EMBEDDABLE',
                  'test name',
                  {} as unknown as SavedObjectCommon
                )
              }
            >
              Add legacy embeddable!
            </button>
          </>
        )
      ),
  };
});

describe('add panel flyout', () => {
  describe('registered embeddables', () => {
    let container: Container;
    const onAdd = jest.fn();

    beforeAll(() => {
      registerReactEmbeddableSavedObject({
        onAdd,
        embeddableType: 'AWESOME_EMBEDDABLE',
        savedObjectType: 'AWESOME_EMBEDDABLE',
        savedObjectName: 'Awesome sauce',
        getIconForSavedObject: () => 'happyface',
      });

      embeddableStart.getEmbeddableFactories = jest.fn().mockReturnValue([]);
    });

    beforeEach(() => {
      onAdd.mockClear();
      container = getMockPresentationContainer() as unknown as Container;
      // @ts-ignore type is only expected on a dashboard container
      container.type = 'DASHBOARD_CONTAINER';
    });

    test('add panel flyout renders SavedObjectFinder', async () => {
      const { container: componentContainer } = render(<AddPanelFlyout container={container} />);

      // component should not contain an extra flyout
      // https://github.com/elastic/kibana/issues/64789
      const flyout = componentContainer.querySelector('.euiFlyout');
      expect(flyout).toBeNull();
      const dummyButton = screen.queryAllByTestId('soFinderAddButton');
      expect(dummyButton).toHaveLength(1);
    });

    test('add panel calls the registered onAdd method', async () => {
      render(<AddPanelFlyout container={container} />);
      expect(Object.values(container.children$.value).length).toBe(0);
      fireEvent.click(screen.getByTestId('soFinderAddButton'));
      // flush promises
      await new Promise((r) => setTimeout(r, 1));

      expect(onAdd).toHaveBeenCalledWith(container, {});
    });

    test('runs telemetry function on add embeddable', async () => {
      render(<AddPanelFlyout container={container} />);

      expect(Object.values(container.children$.value).length).toBe(0);
      fireEvent.click(screen.getByTestId('soFinderAddButton'));
      // flush promises
      await new Promise((r) => setTimeout(r, 1));

      expect(usageCollection.reportUiCounter).toHaveBeenCalledWith(
        'DASHBOARD_CONTAINER',
        'click',
        'AWESOME_EMBEDDABLE:add'
      );
    });
  });

  describe('legacy embeddables', () => {
    let container: Container;

    beforeEach(() => {
      const coreStart = coreMock.createStart();
      const contactCardEmbeddableFactory = new ContactCardEmbeddableFactory(
        (() => null) as any,
        coreStart
      );

      embeddableStart.getEmbeddableFactories = jest
        .fn()
        .mockReturnValue([contactCardEmbeddableFactory]);

      container = getMockPresentationContainer() as unknown as Container;
      container.addNewEmbeddable = jest.fn().mockResolvedValue({ id: 'foo' });
      // @ts-ignore type is only expected on a dashboard container
      container.type = 'HELLO_WORLD_CONTAINER';
    });

    test('add panel flyout renders SavedObjectFinder', async () => {
      const { container: componentContainer } = render(<AddPanelFlyout container={container} />);

      // component should not contain an extra flyout
      // https://github.com/elastic/kibana/issues/64789
      const flyout = componentContainer.querySelector('.euiFlyout');
      expect(flyout).toBeNull();
      const dummyButton = screen.queryAllByTestId('soFinderAddLegacyButton');
      expect(dummyButton).toHaveLength(1);
    });

    test('add panel adds legacy embeddable to container', async () => {
      render(<AddPanelFlyout container={container} />);
      expect(Object.values(container.children$.value).length).toBe(0);
      fireEvent.click(screen.getByTestId('soFinderAddLegacyButton'));
      // flush promises
      await new Promise((r) => setTimeout(r, 1));

      expect(container.addNewEmbeddable).toHaveBeenCalled();
    });

    test('shows a success toast on add', async () => {
      render(<AddPanelFlyout container={container} />);
      fireEvent.click(screen.getByTestId('soFinderAddLegacyButton'));
      // flush promises
      await new Promise((r) => setTimeout(r, 1));

      expect(core.notifications.toasts.addSuccess).toHaveBeenCalledWith({
        'data-test-subj': 'addObjectToContainerSuccess',
        title: 'test name was added',
      });
    });

    test('runs telemetry function on add legacy embeddable', async () => {
      render(<AddPanelFlyout container={container} />);

      expect(Object.values(container.children$.value).length).toBe(0);
      fireEvent.click(screen.getByTestId('soFinderAddLegacyButton'));
      // flush promises
      await new Promise((r) => setTimeout(r, 1));

      expect(usageCollection.reportUiCounter).toHaveBeenCalledWith(
        'HELLO_WORLD_CONTAINER',
        'click',
        'CONTACT_CARD_EMBEDDABLE:add'
      );
    });
  });
});
