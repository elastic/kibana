/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ContactCardEmbeddable,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  ContactCardExportableEmbeddableFactory,
  CONTACT_CARD_EXPORTABLE_EMBEDDABLE,
} from '@kbn/embeddable-plugin/public/lib/test_samples/embeddables';
import { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { LINE_FEED_CHARACTER } from '@kbn/data-plugin/common/exports/export_csv';
import { isErrorEmbeddable, IContainer, ErrorEmbeddable } from '@kbn/embeddable-plugin/public';

import { ExportCSVAction } from './export_csv_action';
import { pluginServices } from '../services/plugin_services';
import { getSampleDashboardInput, getSampleDashboardPanel } from '../mocks';
import { DashboardContainer } from '../dashboard_container/embeddable/dashboard_container';

describe('Export CSV action', () => {
  let container: DashboardContainer;
  let embeddable: ContactCardEmbeddable;
  let coreStart: CoreStart;

  const mockEmbeddableFactory = new ContactCardExportableEmbeddableFactory(
    (() => null) as any,
    {} as any
  );
  pluginServices.getServices().embeddable.getEmbeddableFactory = jest
    .fn()
    .mockReturnValue(mockEmbeddableFactory);

  beforeEach(async () => {
    coreStart = coreMock.createStart();
    coreStart.savedObjects.client = {
      ...coreStart.savedObjects.client,
      get: jest.fn().mockImplementation(() => ({ attributes: { title: 'Holy moly' } })),
      find: jest.fn().mockImplementation(() => ({ total: 15 })),
      create: jest.fn().mockImplementation(() => ({ id: 'brandNewSavedObject' })),
    };

    const input = getSampleDashboardInput({
      panels: {
        '123': getSampleDashboardPanel<ContactCardEmbeddableInput>({
          explicitInput: { firstName: 'Kibanana', id: '123' },
          type: CONTACT_CARD_EXPORTABLE_EMBEDDABLE,
        }),
      },
    });
    container = new DashboardContainer(input);

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
    const action = new ExportCSVAction();
    const errorEmbeddable = new ErrorEmbeddable(
      'Wow what an awful error',
      { id: ' 404' },
      embeddable.getRoot() as IContainer
    );
    expect(await action.isCompatible({ embeddable: errorEmbeddable })).toBe(false);
  });

  test('Should download a compatible Embeddable', async () => {
    const action = new ExportCSVAction();
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
    const action = new ExportCSVAction();
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
