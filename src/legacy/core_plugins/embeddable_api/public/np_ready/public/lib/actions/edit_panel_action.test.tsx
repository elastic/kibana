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
import { EmbeddableFactory, Embeddable, EmbeddableInput } from '../embeddables';
import { GetEmbeddableFactory, ViewMode } from '../types';
import { ContactCardEmbeddable } from '../test_samples';

const embeddableFactories = new Map<string, EmbeddableFactory>();
const getFactory: GetEmbeddableFactory = (id: string) => embeddableFactories.get(id);

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
  const action = new EditPanelAction(getFactory);
  expect(
    await action.isCompatible({
      embeddable: new EditableEmbeddable({ id: '123', viewMode: ViewMode.EDIT }, true),
    })
  ).toBe(true);
});

test('getHref returns the edit urls', async () => {
  const action = new EditPanelAction(getFactory);
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
  const action = new EditPanelAction(getFactory);
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
  embeddableFactories.clear();
  const action = new EditPanelAction(type => embeddableFactories.get(type));
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
  embeddableFactories.clear();
  const action = new EditPanelAction(type => embeddableFactories.get(type));
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
