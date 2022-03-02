/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ViewMode, EmbeddableOutput, isErrorEmbeddable } from '../../../../';
import { AddPanelAction } from './add_panel_action';
import {
  MockFilter,
  FILTERABLE_EMBEDDABLE,
  FilterableEmbeddable,
  FilterableEmbeddableInput,
} from '../../../../test_samples/embeddables/filterable_embeddable';
import { FilterableEmbeddableFactory } from '../../../../test_samples/embeddables/filterable_embeddable_factory';
import { FilterableContainer } from '../../../../test_samples/embeddables/filterable_container';
import { coreMock, themeServiceMock } from '../../../../../../../../core/public/mocks';
import { ContactCardEmbeddable } from '../../../../test_samples';
import { EmbeddableStart } from '../../../../../plugin';
import { embeddablePluginMock } from '../../../../../mocks';
import { defaultTrigger } from '../../../../../../../ui_actions/public/triggers';

const { setup, doStart } = embeddablePluginMock.createInstance();
setup.registerEmbeddableFactory(FILTERABLE_EMBEDDABLE, new FilterableEmbeddableFactory());
const getFactory = doStart().getEmbeddableFactory;
const theme = themeServiceMock.createStartContract();

let container: FilterableContainer;
let embeddable: FilterableEmbeddable;
let action: AddPanelAction;

beforeEach(async () => {
  const start = coreMock.createStart();
  action = new AddPanelAction(
    () => undefined,
    () => [] as any,
    start.overlays,
    start.notifications,
    () => null,
    theme
  );

  const derivedFilter: MockFilter = {
    $state: { store: 'appState' },
    meta: { disabled: false, alias: 'name', negate: false },
    query: { match: {} },
  };
  container = new FilterableContainer(
    { id: 'hello', panels: {}, filters: [derivedFilter] },
    getFactory as EmbeddableStart['getEmbeddableFactory']
  );

  const filterableEmbeddable = await container.addNewEmbeddable<
    FilterableEmbeddableInput,
    EmbeddableOutput,
    FilterableEmbeddable
  >(FILTERABLE_EMBEDDABLE, {
    id: '123',
  });

  if (isErrorEmbeddable<FilterableEmbeddable>(filterableEmbeddable)) {
    throw new Error('Error creating new filterable embeddable');
  } else {
    embeddable = filterableEmbeddable;
  }
});

test('Is not compatible when container is in view mode', async () => {
  const start = coreMock.createStart();
  const addPanelAction = new AddPanelAction(
    () => undefined,
    () => [] as any,
    start.overlays,
    start.notifications,
    () => null,
    theme
  );
  container.updateInput({ viewMode: ViewMode.VIEW });
  expect(
    await addPanelAction.isCompatible({ embeddable: container, trigger: defaultTrigger })
  ).toBe(false);
});

test('Is not compatible when embeddable is not a container', async () => {
  expect(await action.isCompatible({ embeddable } as any)).toBe(false);
});

test('Is compatible when embeddable is a parent and in edit mode', async () => {
  container.updateInput({ viewMode: ViewMode.EDIT });
  expect(await action.isCompatible({ embeddable: container, trigger: defaultTrigger })).toBe(true);
});

test('Execute throws an error when called with an embeddable that is not a container', async () => {
  async function check() {
    await action.execute({
      embeddable: new ContactCardEmbeddable(
        {
          firstName: 'sue',
          id: '123',
          viewMode: ViewMode.EDIT,
        },
        {} as any
      ),
      trigger: defaultTrigger,
    } as any);
  }
  await expect(check()).rejects.toThrow(Error);
});
test('Execute does not throw an error when called with a compatible container', async () => {
  container.updateInput({ viewMode: ViewMode.EDIT });
  await action.execute({
    embeddable: container,
    trigger: defaultTrigger,
  });
});

test('Returns title', async () => {
  expect(action.getDisplayName()).toBeDefined();
});

test('Returns an icon', async () => {
  expect(action.getIconType()).toBeDefined();
});
