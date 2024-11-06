/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of } from 'rxjs';

import { embeddablePluginMock } from '../../../mocks';
import { applicationServiceMock } from '@kbn/core/public/mocks';
import { Embeddable, EmbeddableInput, ViewMode } from '../..';
import { canEditEmbeddable, editLegacyEmbeddable } from './edit_legacy_embeddable';
import { ContactCardEmbeddable } from '../../test_samples';
import { core, embeddableStart } from '../../../kibana_services';

const applicationMock = applicationServiceMock.createStartContract();
const stateTransferMock = embeddablePluginMock.createStartContract().getStateTransfer();

// mock app id
core.application.currentAppId$ = of('superCoolCurrentApp');

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

test('canEditEmbeddable returns true when edit url is available, in edit mode and editable', () => {
  expect(
    canEditEmbeddable(new EditableEmbeddable({ id: '123', viewMode: ViewMode.EDIT }, true))
  ).toBe(true);
});

test('canEditEmbeddable returns false when edit url is not available', async () => {
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
  expect(canEditEmbeddable(embeddable)).toBe(false);
});

test('canEditEmbeddable returns false when edit url is available but in view mode', async () => {
  expect(
    canEditEmbeddable(
      new EditableEmbeddable(
        {
          id: '123',
          viewMode: ViewMode.VIEW,
        },
        true
      )
    )
  ).toBe(false);
});

test('canEditEmbeddable returns false when edit url is available, in edit mode, but not editable', async () => {
  expect(
    canEditEmbeddable(
      new EditableEmbeddable(
        {
          id: '123',
          viewMode: ViewMode.EDIT,
        },
        false
      )
    )
  ).toBe(false);
});

test('getEditHref returns the edit url', async () => {
  const embeddable = new EditableEmbeddable({ id: '123', viewMode: ViewMode.EDIT }, true);
  expect(await embeddable.getEditHref()).toBe(embeddable.getOutput().editUrl);
});

test('redirects to app using state transfer', async () => {
  embeddableStart.getStateTransfer = jest.fn().mockReturnValue(stateTransferMock);

  applicationMock.currentAppId$ = of('superCoolCurrentApp');
  const testPath = '/test-path';
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
  embeddable.getAppContext = jest.fn().mockReturnValue({
    getCurrentPath: () => testPath,
  });
  await editLegacyEmbeddable(embeddable);
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
      searchSessionId: undefined,
    },
  });
});
