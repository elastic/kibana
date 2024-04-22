/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LINE_FEED_CHARACTER } from '@kbn/data-plugin/common/exports/export_csv';
import { ExportCSVAction, ExportCsvActionApi } from './export_csv_action';

describe('Export CSV action', () => {
  let action: ExportCSVAction;
  let context: { embeddable: ExportCsvActionApi };

  beforeEach(async () => {
    action = new ExportCSVAction();
    context = {
      embeddable: {
        getInspectorAdapters: () => ({
          tables: {
            allowCsvExport: true,
            tables: {
              layer1: {
                type: 'datatable',
                columns: [
                  { id: 'firstName', name: 'First Name' },
                  { id: 'originalLastName', name: 'Last Name' },
                ],
                rows: [
                  {
                    firstName: 'Kibanana',
                    orignialLastName: 'Kiwi',
                  },
                ],
              },
            },
          },
        }),
      },
    };
  });

  it('is compatible when api meets all conditions', async () => {
    expect(await action.isCompatible(context)).toBe(true);
  });

  it('is incompatible with APIs without a getInspectorAdapters implementation', async () => {
    const emptyContext = {
      embeddable: {},
    };
    expect(await action.isCompatible(emptyContext)).toBe(false);
  });

  it('Should download if the API is compatible', async () => {
    const result = (await action.execute({
      embeddable: context.embeddable,
      asString: true,
    })) as unknown as undefined | Record<string, { content: string; type: string }>;
    expect(result).toEqual({
      'untitled.csv': {
        content: `First Name,Last Name${LINE_FEED_CHARACTER}Kibanana,${LINE_FEED_CHARACTER}`,
        type: 'text/plain;charset=utf-8',
      },
    });
  });
});
