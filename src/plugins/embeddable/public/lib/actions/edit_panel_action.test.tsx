/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { EditPanelAction } from './edit_panel_action';
import { Embeddable, EmbeddableInput } from '../embeddables';
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

test('redirects to app using state transfer', async () => {
  applicationMock.currentAppId$ = of('superCoolCurrentApp');
  const action = new EditPanelAction(getFactory, applicationMock, stateTransferMock);
  const input = { id: '123', viewMode: ViewMode.EDIT };
  const embeddable = new EditableEmbeddable(input, true);
  embeddable.getOutput = jest.fn(() => ({ editApp: 'ultraVisualize', editPath: '/123' }));
  await action.execute({ embeddable });
  expect(stateTransferMock.navigateToEditor).toHaveBeenCalledWith('ultraVisualize', {
    path: '/123',
    state: {
      originatingApp: 'superCoolCurrentApp',
      byValueMode: true,
      embeddableId: '123',
      valueInput: input,
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
