/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableOutput, isErrorEmbeddable } from '../../..';
import { RemovePanelAction } from './remove_panel_action';
import { EmbeddableStart } from '../../../../plugin';
import {
  MockFilter,
  FILTERABLE_EMBEDDABLE,
  FilterableEmbeddable,
  FilterableEmbeddableInput,
} from '../../../test_samples/embeddables/filterable_embeddable';
import { FilterableEmbeddableFactory } from '../../../test_samples/embeddables/filterable_embeddable_factory';
import { FilterableContainer } from '../../../test_samples/embeddables/filterable_container';
import { ViewMode } from '../../../types';
import { ContactCardEmbeddable } from '../../../test_samples/embeddables/contact_card/contact_card_embeddable';
import { embeddablePluginMock } from '../../../../mocks';

const { setup, doStart } = embeddablePluginMock.createInstance();
setup.registerEmbeddableFactory(FILTERABLE_EMBEDDABLE, new FilterableEmbeddableFactory());
const getFactory = doStart().getEmbeddableFactory;
let container: FilterableContainer;
let embeddable: FilterableEmbeddable;

beforeEach(async () => {
  const derivedFilter: MockFilter = {
    $state: { store: 'appState' },
    meta: { disabled: false, alias: 'name', negate: false },
    query: { match: {} },
  };
  container = new FilterableContainer(
    { id: 'hello', panels: {}, filters: [derivedFilter], viewMode: ViewMode.EDIT },
    getFactory as EmbeddableStart['getEmbeddableFactory']
  );

  const filterableEmbeddable = await container.addNewEmbeddable<
    FilterableEmbeddableInput,
    EmbeddableOutput,
    FilterableEmbeddable
  >(FILTERABLE_EMBEDDABLE, {
    id: '123',
    viewMode: ViewMode.EDIT,
  });

  if (isErrorEmbeddable(filterableEmbeddable)) {
    throw new Error('Error creating new filterable embeddable');
  } else {
    embeddable = filterableEmbeddable;
  }
});

test('Removes the embeddable', async () => {
  const removePanelAction = new RemovePanelAction();
  expect(container.getChild(embeddable.id)).toBeDefined();

  await removePanelAction.execute({ embeddable });

  expect(container.getChild(embeddable.id)).toBeUndefined();
});

test('Is not compatible when embeddable is not in a parent', async () => {
  const action = new RemovePanelAction();
  expect(
    await action.isCompatible({
      embeddable: new ContactCardEmbeddable(
        {
          firstName: 'Sandor',
          lastName: 'Clegane',
          id: '123',
        },
        { execAction: (() => null) as any }
      ),
    })
  ).toBe(false);
});

test('Execute throws an error when called with an embeddable not in a parent', async () => {
  const action = new RemovePanelAction();
  async function check() {
    await action.execute({ embeddable: container });
  }
  await expect(check()).rejects.toThrow(Error);
});

test('Returns title', async () => {
  const action = new RemovePanelAction();
  expect(action.getDisplayName()).toBeDefined();
});

test('Returns an icon type', async () => {
  const action = new RemovePanelAction();
  expect(action.getIconType()).toBeDefined();
});
