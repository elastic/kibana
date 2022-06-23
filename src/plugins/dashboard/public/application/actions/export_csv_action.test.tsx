/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from '@kbn/core/public';

import { isErrorEmbeddable, IContainer, ErrorEmbeddable } from '../../services/embeddable';
import { DashboardContainer } from '../embeddable/dashboard_container';
import { getSampleDashboardInput, getSampleDashboardPanel } from '../test_helpers';
import {
  ContactCardEmbeddable,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  ContactCardExportableEmbeddableFactory,
  CONTACT_CARD_EXPORTABLE_EMBEDDABLE,
} from '../../services/embeddable_test_samples';
import { coreMock, uiSettingsServiceMock } from '@kbn/core/public/mocks';
import { ExportCSVAction } from './export_csv_action';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { DataPublicPluginStart } from '@kbn/data-plugin/public/types';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { LINE_FEED_CHARACTER } from '@kbn/data-plugin/common/exports/export_csv';
import { getStubPluginServices } from '@kbn/presentation-util-plugin/public';
import { screenshotModePluginMock } from '@kbn/screenshot-mode-plugin/public/mocks';

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
      uiSettings: uiSettingsServiceMock.createStartContract(),
      http: coreStart.http,
      theme: coreStart.theme,
      presentationUtil: getStubPluginServices(),
      screenshotMode: screenshotModePluginMock.createSetupContract(),
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
    const result = (await action.execute({ embeddable, asString: true })) as unknown as
      | undefined
      | Record<string, { content: string; type: string }>;
    expect(result).toEqual({
      'Hello Kibana.csv': {
        content: `First Name,Last Name${LINE_FEED_CHARACTER}Kibana,${LINE_FEED_CHARACTER}`,
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
    const result = (await action.execute({
      embeddable: errorEmbeddable,
      asString: true,
    })) as unknown as undefined | Record<string, string>;
    expect(result).toBeUndefined();
  });
});
