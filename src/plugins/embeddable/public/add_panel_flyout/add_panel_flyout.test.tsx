/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { EuiFlyout } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { mountWithIntl as mount } from '@kbn/test-jest-helpers';
import { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';

import { AddPanelFlyout } from './add_panel_flyout';
import { core, embeddableStart, usageCollection } from '../kibana_services';
import { HelloWorldContainer, ContactCardEmbeddableFactory } from '../lib/test_samples';

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
          <button
            id="soFinderDummyButton"
            onClick={() =>
              onChoose?.(
                'testId',
                'CONTACT_CARD_EMBEDDABLE',
                'test name',
                {} as unknown as SavedObjectCommon
              )
            }
          >
            Dummy Button!
          </button>
        )
      ),
  };
});

describe('add panel flyout', () => {
  let container: HelloWorldContainer;

  beforeEach(() => {
    const { overlays } = coreMock.createStart();
    const contactCardEmbeddableFactory = new ContactCardEmbeddableFactory(
      (() => null) as any,
      overlays
    );

    embeddableStart.getEmbeddableFactories = jest
      .fn()
      .mockReturnValue([contactCardEmbeddableFactory]);

    container = new HelloWorldContainer(
      {
        id: '1',
        panels: {},
      },
      {
        getEmbeddableFactory: embeddableStart.getEmbeddableFactory,
      }
    );
    container.addNewEmbeddable = jest.fn().mockResolvedValue({ id: 'foo' });
  });

  test('add panel flyout renders SavedObjectFinder', async () => {
    const component = mount(<AddPanelFlyout container={container} />);

    // https://github.com/elastic/kibana/issues/64789
    expect(component.exists(EuiFlyout)).toBe(false);
    expect(component.find('#soFinderDummyButton').length).toBe(1);
  });

  test('add panel adds embeddable to container', async () => {
    const component = mount(<AddPanelFlyout container={container} />);

    expect(Object.values(container.getInput().panels).length).toBe(0);
    component.find('#soFinderDummyButton').simulate('click');
    // flush promises
    await new Promise((r) => setTimeout(r, 1));

    expect(container.addNewEmbeddable).toHaveBeenCalled();
  });

  test('shows a success toast on add', async () => {
    const component = mount(<AddPanelFlyout container={container} />);
    component.find('#soFinderDummyButton').simulate('click');
    // flush promises
    await new Promise((r) => setTimeout(r, 1));

    expect(core.notifications.toasts.addSuccess).toHaveBeenCalledWith({
      'data-test-subj': 'addObjectToContainerSuccess',
      title: 'test name was added',
    });
  });

  test('runs telemetry function on add', async () => {
    const component = mount(<AddPanelFlyout container={container} />);

    expect(Object.values(container.getInput().panels).length).toBe(0);
    component.find('#soFinderDummyButton').simulate('click');
    // flush promises
    await new Promise((r) => setTimeout(r, 1));

    expect(usageCollection.reportUiCounter).toHaveBeenCalledWith(
      'HELLO_WORLD_CONTAINER',
      'click',
      'CONTACT_CARD_EMBEDDABLE:add'
    );
  });
});
