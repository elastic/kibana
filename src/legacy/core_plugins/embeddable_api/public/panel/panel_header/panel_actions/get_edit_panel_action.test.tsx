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

jest.mock('ui/metadata', () => ({
  metadata: {
    branch: 'my-metadata-branch',
    version: 'my-metadata-version',
  },
}));

jest.mock('ui/capabilities', () => ({
  uiCapabilities: {
    visualize: {
      save: true,
    },
  },
}));

import { getEditPanelAction } from './get_edit_panel_action';
import { Embeddable, EmbeddableInput } from 'plugins/embeddable_api/embeddables';
import { HelloWorldEmbeddable } from 'plugins/embeddable_api/__test__';
import { ViewMode } from 'plugins/embeddable_api/types';

class EditableEmbeddable extends Embeddable {
  constructor(input: EmbeddableInput, editable: boolean) {
    super('EDITABLE_EMBEDDABLE', input, {
      editUrl: 'www.google.com',
      editable,
    });
  }
}

test('is visible when edit url is available, in edit mode and editable', async () => {
  const action = getEditPanelAction();
  expect(
    action.isVisible({
      embeddable: new EditableEmbeddable({ id: '123', viewMode: ViewMode.EDIT }, true),
    })
  ).toBe(true);
});

test('is enabled when edit url is available and in edit mode', async () => {
  const action = getEditPanelAction();
  expect(
    action.isDisabled({
      embeddable: new EditableEmbeddable({ id: '123', viewMode: ViewMode.EDIT }, true),
    })
  ).toBe(false);
});

test('getHref returns the edit urls', async () => {
  const action = getEditPanelAction();
  expect(action.getHref).toBeDefined();

  if (action.getHref) {
    const embeddable = new EditableEmbeddable({ id: '123', viewMode: ViewMode.EDIT }, true);
    expect(
      action.getHref({
        embeddable,
      })
    ).toBe(embeddable.getOutput().editUrl);
  }
});

test('is not visible when edit url is not available', async () => {
  const action = getEditPanelAction();
  expect(
    action.isVisible({
      embeddable: new HelloWorldEmbeddable({
        id: '123',
        firstName: 'sue',
        viewMode: ViewMode.EDIT,
      }),
    })
  ).toBe(false);
});

test('is disabled when edit url is not available', async () => {
  const action = getEditPanelAction();
  expect(
    action.isDisabled({
      embeddable: new HelloWorldEmbeddable({
        id: '123',
        firstName: 'sue',
        viewMode: ViewMode.EDIT,
      }),
    })
  ).toBe(true);
});

test('is not visible when edit url is available but in view mode', async () => {
  const action = getEditPanelAction();
  expect(
    action.isVisible({
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

test('is not visible when edit url is available, in edit mode, but not editable', async () => {
  const action = getEditPanelAction();
  expect(
    action.isVisible({
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
