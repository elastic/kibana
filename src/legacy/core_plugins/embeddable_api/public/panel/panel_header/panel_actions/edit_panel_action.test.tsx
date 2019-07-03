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

import '../../../ui_capabilities.test.mocks';
import '../../../../../../../core/public/ui_new_platform.test.mocks';

import { EmbeddableInput } from '../../../embeddables/i_embeddable';
import { Embeddable } from '../../../embeddables/embeddable';
import { ContactCardEmbeddable } from '../../../test_samples';
import { ViewMode } from '../../../types';
import { EditPanelAction } from './edit_panel_action';

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
  const action = new EditPanelAction();
  expect(
    await action.isCompatible({
      embeddable: new EditableEmbeddable({ id: '123', viewMode: ViewMode.EDIT }, true),
    })
  ).toBe(true);
});

test('getHref returns the edit urls', async () => {
  const action = new EditPanelAction();
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

test('is not compatible when edit url is not available', async () => {
  const action = new EditPanelAction();
  expect(
    await action.isCompatible({
      embeddable: new ContactCardEmbeddable({
        id: '123',
        firstName: 'sue',
        viewMode: ViewMode.EDIT,
      }),
    })
  ).toBe(false);
});

test('is not visible when edit url is available but in view mode', async () => {
  const action = new EditPanelAction();
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
  const action = new EditPanelAction();
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
