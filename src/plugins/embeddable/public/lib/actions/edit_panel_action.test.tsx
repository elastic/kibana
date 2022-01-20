/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EditPanelAction } from './edit_panel_action';
import { Embeddable, EmbeddableInput, SavedObjectEmbeddableInput } from '../embeddables';
import { ViewMode } from '../types';
import { ContactCardEmbeddable } from '../test_samples';
import { embeddablePluginMock } from '../../mocks';
import { applicationServiceMock } from '../../../../../core/public/mocks';
import { of } from 'rxjs';

const { doStart } = embeddablePluginMock.createInstance();
const start = doStart();
const getFactory = start.getEmbeddableFactory;
const applicationMock = applicationServiceMock.createStartContract();
const stateTransferMock = embeddablePluginMock.createStartContract().getStateTransfer();

class EditableEmbeddable extends Embeddable {
  public readonly type = 'EDITABLE_EMBEDDABLE';

  constructor(input: EmbeddableInput, editable: boolean) {
    super(input, {
      editUrl: 'www.google.com',
      editable,
    });
  }

  public reload() {}
}

test('is compatible when edit url is available, in edit mode and editable', async () => {
  const action = new EditPanelAction(getFactory, applicationMock, stateTransferMock);
  expect(
    await action.isCompatible({
      embeddable: new EditableEmbeddable({ id: '123', viewMode: ViewMode.EDIT }, true),
    })
  ).toBe(true);
});

test('redirects to app using state transfer with by value mode', async () => {
  applicationMock.currentAppId$ = of('superCoolCurrentApp');
  const testPath = '/test-path';
  const action = new EditPanelAction(
    getFactory,
    applicationMock,
    stateTransferMock,
    () => testPath
  );
  const embeddable = new EditableEmbeddable(
    {
      id: '123',
      viewMode: ViewMode.EDIT,
      coolInput1: 1,
      coolInput2: 2,
    } as unknown as EmbeddableInput,
    true
  );
  embeddable.getOutput = jest.fn(() => ({ editApp: 'ultraVisualize', editPath: '/123' }));
  await action.execute({ embeddable });
  expect(stateTransferMock.navigateToEditor).toHaveBeenCalledWith('ultraVisualize', {
    path: '/123',
    state: {
      originatingApp: 'superCoolCurrentApp',
      embeddableId: '123',
      valueInput: {
        id: '123',
        viewMode: ViewMode.EDIT,
        coolInput1: 1,
        coolInput2: 2,
      },
      originatingPath: testPath,
    },
  });
});

test('redirects to app using state transfer without by value mode', async () => {
  applicationMock.currentAppId$ = of('superCoolCurrentApp');
  const testPath = '/test-path';
  const action = new EditPanelAction(
    getFactory,
    applicationMock,
    stateTransferMock,
    () => testPath
  );
  const embeddable = new EditableEmbeddable(
    { id: '123', viewMode: ViewMode.EDIT, savedObjectId: '1234' } as SavedObjectEmbeddableInput,
    true
  );
  embeddable.getOutput = jest.fn(() => ({ editApp: 'ultraVisualize', editPath: '/123' }));
  await action.execute({ embeddable });
  expect(stateTransferMock.navigateToEditor).toHaveBeenCalledWith('ultraVisualize', {
    path: '/123',
    state: {
      originatingApp: 'superCoolCurrentApp',
      embeddableId: '123',
      valueInput: undefined,
      originatingPath: testPath,
    },
  });
});

test('getHref returns the edit urls', async () => {
  const action = new EditPanelAction(getFactory, applicationMock, stateTransferMock);
  expect(action.getHref).toBeDefined();

  if (action.getHref) {
    const embeddable = new EditableEmbeddable({ id: '123', viewMode: ViewMode.EDIT }, true);
    expect(
      await action.getHref({
        embeddable,
      })
    ).toBe(embeddable.getOutput().editUrl);
  }
});

test('is not compatible when edit url is not available', async () => {
  const action = new EditPanelAction(getFactory, applicationMock, stateTransferMock);
  const embeddable = new ContactCardEmbeddable(
    {
      id: '123',
      firstName: 'sue',
      viewMode: ViewMode.EDIT,
    },
    {
      execAction: () => Promise.resolve(undefined),
    }
  );
  expect(
    await action.isCompatible({
      embeddable,
    })
  ).toBe(false);
});

test('is not visible when edit url is available but in view mode', async () => {
  const action = new EditPanelAction(getFactory, applicationMock, stateTransferMock);
  expect(
    await action.isCompatible({
      embeddable: new EditableEmbeddable(
        {
          id: '123',
          viewMode: ViewMode.VIEW,
        },
        true
      ),
    })
  ).toBe(false);
});

test('is not compatible when edit url is available, in edit mode, but not editable', async () => {
  const action = new EditPanelAction(getFactory, applicationMock, stateTransferMock);
  expect(
    await action.isCompatible({
      embeddable: new EditableEmbeddable(
        {
          id: '123',
          viewMode: ViewMode.EDIT,
        },
        false
      ),
    })
  ).toBe(false);
});
