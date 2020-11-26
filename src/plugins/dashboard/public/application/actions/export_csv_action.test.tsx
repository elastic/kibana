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

import { CoreStart } from 'kibana/public';

import { isErrorEmbeddable, IContainer, ErrorEmbeddable } from '../../embeddable_plugin';
import { DashboardContainer } from '../../application/embeddable';
import { getSampleDashboardInput, getSampleDashboardPanel } from '../../application/test_helpers';
import {
  ContactCardEmbeddable,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  ContactCardExportableEmbeddableFactory,
  CONTACT_CARD_EXPORTABLE_EMBEDDABLE,
} from '../../embeddable_plugin_test_samples';
import { coreMock } from '../../../../../core/public/mocks';
import { ExportCSVAction } from './export_csv_action';
import { embeddablePluginMock } from '../../../../embeddable/public/mocks';
import { DataPublicPluginStart } from '../../../../data/public/types';
import { dataPluginMock } from '../../../../data/public/mocks';
import { LINE_FEED_CHARACTER } from 'src/plugins/data/common/exports/export_csv';

describe('Export CSV action', () => {
  const { setup, doStart } = embeddablePluginMock.createInstance();
  setup.registerEmbeddableFactory(
    CONTACT_CARD_EXPORTABLE_EMBEDDABLE,
    new ContactCardExportableEmbeddableFactory((() => null) as any, {} as any)
  );
  const start = doStart();

  let container: DashboardContainer;
  let embeddable: ContactCardEmbeddable;
  let coreStart: CoreStart;
  let dataMock: jest.Mocked<DataPublicPluginStart>;

  beforeEach(async () => {
    coreStart = coreMock.createStart();
    coreStart.savedObjects.client = {
      ...coreStart.savedObjects.client,
      get: jest.fn().mockImplementation(() => ({ attributes: { title: 'Holy moly' } })),
      find: jest.fn().mockImplementation(() => ({ total: 15 })),
      create: jest.fn().mockImplementation(() => ({ id: 'brandNewSavedObject' })),
    };

    const options = {
      ExitFullScreenButton: () => null,
      SavedObjectFinder: () => null,
      application: {} as any,
      embeddable: start,
      inspector: {} as any,
      notifications: {} as any,
      overlays: coreStart.overlays,
      savedObjectMetaData: {} as any,
      uiActions: {} as any,
    };
    const input = getSampleDashboardInput({
      panels: {
        '123': getSampleDashboardPanel<ContactCardEmbeddableInput>({
          explicitInput: { firstName: 'Kibanana', id: '123' },
          type: CONTACT_CARD_EXPORTABLE_EMBEDDABLE,
        }),
      },
    });
    container = new DashboardContainer(input, options);
    dataMock = dataPluginMock.createStartContract();

    const contactCardEmbeddable = await container.addNewEmbeddable<
      ContactCardEmbeddableInput,
      ContactCardEmbeddableOutput,
      ContactCardEmbeddable
    >(CONTACT_CARD_EXPORTABLE_EMBEDDABLE, {
      firstName: 'Kibana',
    });

    if (isErrorEmbeddable(contactCardEmbeddable)) {
      throw new Error('Failed to create embeddable');
    } else {
      embeddable = contactCardEmbeddable;
    }
  });

  test('Download is incompatible with embeddables without getInspectorAdapters implementation', async () => {
    const action = new ExportCSVAction({ core: coreStart, data: dataMock });
    const errorEmbeddable = new ErrorEmbeddable(
      'Wow what an awful error',
      { id: ' 404' },
      embeddable.getRoot() as IContainer
    );
    expect(await action.isCompatible({ embeddable: errorEmbeddable })).toBe(false);
  });

  test('Should download a compatible Embeddable', async () => {
    const action = new ExportCSVAction({ core: coreStart, data: dataMock });
    const result = ((await action.execute({ embeddable, asString: true })) as unknown) as
      | undefined
      | Record<string, { content: string; type: string }>;
    expect(result).toEqual({
      'Hello Kibana.csv': {
        content: `First Name,Last Name${LINE_FEED_CHARACTER}Kibana,undefined${LINE_FEED_CHARACTER}`,
        type: 'text/plain;charset=utf-8',
      },
    });
  });

  test('Should not download incompatible Embeddable', async () => {
    const action = new ExportCSVAction({ core: coreStart, data: dataMock });
    const errorEmbeddable = new ErrorEmbeddable(
      'Wow what an awful error',
      { id: ' 404' },
      embeddable.getRoot() as IContainer
    );
    const result = ((await action.execute({
      embeddable: errorEmbeddable,
      asString: true,
    })) as unknown) as undefined | Record<string, string>;
    expect(result).toBeUndefined();
  });
});
