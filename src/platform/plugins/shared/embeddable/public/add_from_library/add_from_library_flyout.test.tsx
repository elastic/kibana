/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';

import { AddFromLibraryFlyout } from './add_from_library_flyout';
import { contentManagement, usageCollection } from '../kibana_services';
import { getMockPresentationContainer } from '@kbn/presentation-publishing/interfaces/containers/mocks';
import { registerAddFromLibraryType } from './registry';
import type { PresentationContainer, HasType } from '@kbn/presentation-publishing';

import * as SavedObjectsFinderPlugin from '@kbn/saved-objects-finder-plugin/public';
jest.mock('@kbn/saved-objects-finder-plugin/public', () => {
  return {
    __esModule: true, // allows us to overwrite saved object finder via spyOn
    ...jest.requireActual('@kbn/saved-objects-finder-plugin/public'),
  };
});

describe('add from library flyout', () => {
  let container: PresentationContainer & HasType;
  const onAdd = jest.fn();

  beforeAll(() => {
    // Mock saved objects finder component so we can call the onChoose method.
    jest.spyOn(SavedObjectsFinderPlugin, 'SavedObjectFinder').mockImplementation(({ onChoose }) => (
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
      </>
    ));

    registerAddFromLibraryType({
      onAdd,
      savedObjectType: 'AWESOME_EMBEDDABLE',
      savedObjectName: 'Awesome sauce',
      getIconForSavedObject: () => 'happyface',
    });
  });

  beforeEach(() => {
    onAdd.mockClear();
    container = {
      type: 'DASHBOARD_CONTAINER',
      ...getMockPresentationContainer(),
    };
  });

  test('renders SavedObjectFinder', async () => {
    const { container: componentContainer } = render(
      <AddFromLibraryFlyout container={container} />
    );

    // component should not contain an extra flyout
    // https://github.com/elastic/kibana/issues/64789
    const flyout = componentContainer.querySelector('.euiFlyout');
    expect(flyout).toBeNull();
    const dummyButton = screen.queryAllByTestId('soFinderAddButton');
    expect(dummyButton).toHaveLength(1);
  });

  test('calls the registered onAdd method', async () => {
    render(<AddFromLibraryFlyout container={container} />);
    expect(Object.values(container.children$.value).length).toBe(0);
    fireEvent.click(screen.getByTestId('soFinderAddButton'));
    // flush promises
    await new Promise((r) => setTimeout(r, 1));

    expect(onAdd).toHaveBeenCalledWith(container, {});
  });

  test('runs telemetry function on add embeddable', async () => {
    render(<AddFromLibraryFlyout container={container} />);

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

  test('renders saved objects that provide their own getter', async () => {
    contentManagement.client.mSearch = jest.fn().mockResolvedValueOnce({ hits: [] });
    jest
      .spyOn(SavedObjectsFinderPlugin, 'SavedObjectFinder')
      .mockImplementationOnce(
        jest.requireActual('@kbn/saved-objects-finder-plugin/public').SavedObjectFinder
      );
    const mockGetSavedObjects = jest.fn().mockResolvedValue([
      { type: 'no_cm', id: 'test-id', attributes: { title: 'Test1' } },
      { type: 'no_cm', id: 'another-id', attributes: { title: 'Test2' } },
    ]);
    registerAddFromLibraryType({
      onAdd,
      savedObjectType: 'no_cm',
      savedObjectName: 'Use API endpoint to get objects',
      getIconForSavedObject: () => 'popper',
      getSavedObjects: mockGetSavedObjects,
    });

    const result = render(<AddFromLibraryFlyout container={container} />);
    await waitFor(() => {
      expect(mockGetSavedObjects).toBeCalled();
    });
    expect(result.getByTestId('savedObjectTitleTest1')).toBeInTheDocument();
    expect(result.getByTestId('savedObjectTitleTest2')).toBeInTheDocument();
  });
});
