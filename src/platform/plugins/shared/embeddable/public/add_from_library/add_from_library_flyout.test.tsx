/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';

import { AddFromLibraryFlyout } from './add_from_library_flyout';
import { usageCollection } from '../kibana_services';
import { getMockPresentationContainer } from '@kbn/presentation-publishing/interfaces/containers/mocks';
import { registerAddFromLibraryType } from './registry';
import type { PresentationContainer, HasType } from '@kbn/presentation-publishing';

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
          </>
        )
      ),
  };
});

describe('add from library flyout', () => {
  let container: PresentationContainer & HasType;
  const onAdd = jest.fn();

  beforeAll(() => {
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
});
