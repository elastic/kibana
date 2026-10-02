/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LINE_FEED_CHARACTER } from '@kbn/data-plugin/common/exports/export_csv';
import type { ExportCsvActionApi } from './export_csv_action';
import { ExportCSVAction } from './export_csv_action';

describe('Export CSV action', () => {
  let action: ExportCSVAction;
  let context: { embeddable: ExportCsvActionApi };

  const createContext = (missingValueDisplay: 'text' | 'table' = 'text') => ({
    embeddable: {
      getInspectorAdapters: () => ({
        tables: {
          allowCsvExport: true,
          missingValueDisplay,
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
  });

  beforeEach(async () => {
    action = new ExportCSVAction();
    context = createContext();
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
    // The row has no value under the "originalLastName" column id; charts export it through the
    // formatter rather than as a dash.
    expect(result).toEqual({
      'untitled.csv': {
        content: `First Name,Last Name${LINE_FEED_CHARACTER}Kibanana,${LINE_FEED_CHARACTER}`,
        type: 'text/plain;charset=utf-8',
      },
    });
  });

  it('Should export missing values as a dash when the visualization uses table presentation', async () => {
    const result = (await action.execute({
      embeddable: createContext('table').embeddable,
      asString: true,
    })) as unknown as undefined | Record<string, { content: string; type: string }>;
    expect(result).toEqual({
      'untitled.csv': {
        content: `First Name,Last Name${LINE_FEED_CHARACTER}Kibanana,-${LINE_FEED_CHARACTER}`,
        type: 'text/plain;charset=utf-8',
      },
    });
  });
});
