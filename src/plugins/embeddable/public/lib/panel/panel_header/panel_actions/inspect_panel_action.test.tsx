/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { InspectPanelAction } from './inspect_panel_action';
import {
  FilterableContainer,
  FILTERABLE_EMBEDDABLE,
  FilterableEmbeddableFactory,
  FilterableEmbeddableInput,
  FilterableEmbeddable,
  ContactCardEmbeddable,
} from '../../../test_samples';
import { inspectorPluginMock } from '@kbn/inspector-plugin/public/mocks';
import { EmbeddableOutput, isErrorEmbeddable, ErrorEmbeddable } from '../../../embeddables';
import { of } from '../../../../tests/helpers';
import { embeddablePluginMock } from '../../../../mocks';
import { EmbeddableStart } from '../../../../plugin';

const setupTests = async () => {
  const { setup, doStart } = embeddablePluginMock.createInstance();
  setup.registerEmbeddableFactory(FILTERABLE_EMBEDDABLE, new FilterableEmbeddableFactory());
  const getFactory = doStart().getEmbeddableFactory;
  const container = new FilterableContainer(
    {
      id: 'hello',
      panels: {},
      filters: [
        {
          $state: { store: 'appState' },
          meta: { disabled: false, alias: 'name', negate: false },
          query: { match: {} },
        },
      ],
    },
    getFactory as EmbeddableStart['getEmbeddableFactory']
  );

  const embeddable: FilterableEmbeddable | ErrorEmbeddable = await container.addNewEmbeddable<
    FilterableEmbeddableInput,
    EmbeddableOutput,
    FilterableEmbeddable
  >(FILTERABLE_EMBEDDABLE, {
    id: '123',
  });

  if (isErrorEmbeddable(embeddable)) {
    throw new Error('Error creating new filterable embeddable');
  }

  return {
    embeddable,
    container,
  };
};

test('Is compatible when inspector adapters are available', async () => {
  const inspector = inspectorPluginMock.createStartContract();
  inspector.isAvailable.mockImplementation(() => true);

  const { embeddable } = await setupTests();
  const inspectAction = new InspectPanelAction(inspector);

  expect(await inspectAction.isCompatible({ embeddable })).toBe(true);
  expect(inspector.isAvailable).toHaveBeenCalledTimes(1);
  expect(inspector.isAvailable.mock.calls[0][0]).toMatchObject({
    filters: expect.any(String),
  });
});

test('Is not compatible when inspector adapters are not available', async () => {
  const inspector = inspectorPluginMock.createStartContract();
  inspector.isAvailable.mockImplementation(() => false);
  const inspectAction = new InspectPanelAction(inspector);

  expect(
    await inspectAction.isCompatible({
      embeddable: new ContactCardEmbeddable(
        {
          firstName: 'Davos',
          lastName: 'Seaworth',
          id: '123',
        },
        { execAction: () => Promise.resolve(undefined) }
      ),
    })
  ).toBe(false);
  expect(inspector.isAvailable).toHaveBeenCalledTimes(1);
  expect(inspector.isAvailable.mock.calls[0][0]).toMatchInlineSnapshot(`undefined`);
});

test('Executes when inspector adapters are available', async () => {
  const inspector = inspectorPluginMock.createStartContract();
  inspector.isAvailable.mockImplementation(() => true);

  const { embeddable } = await setupTests();
  const inspectAction = new InspectPanelAction(inspector);

  expect(inspector.open).toHaveBeenCalledTimes(0);

  await inspectAction.execute({ embeddable });

  expect(inspector.open).toHaveBeenCalledTimes(1);
});

test('Execute throws an error when inspector adapters are not available', async () => {
  const inspector = inspectorPluginMock.createStartContract();
  inspector.isAvailable.mockImplementation(() => false);
  const inspectAction = new InspectPanelAction(inspector);

  const [, error] = await of(
    inspectAction.execute({
      embeddable: new ContactCardEmbeddable(
        {
          firstName: 'John',
          lastName: 'Snow',
          id: '123',
        },
        { execAction: () => Promise.resolve(undefined) }
      ),
    })
  );

  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toMatchInlineSnapshot(`"Action not compatible with context"`);
});

test('Returns title', async () => {
  const inspector = inspectorPluginMock.createStartContract();
  const inspectAction = new InspectPanelAction(inspector);
  expect(inspectAction.getDisplayName()).toBe('Inspect');
});

test('Returns an icon', async () => {
  const inspector = inspectorPluginMock.createStartContract();
  const inspectAction = new InspectPanelAction(inspector);
  expect(inspectAction.getIconType()).toBe('inspect');
});
