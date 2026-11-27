/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQL_CONTROL } from '@kbn/controls-constants';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { createESQLControlFromValueClickAction } from './create_esql_control_from_value_click_action';

const runtimeColumn = {
  id: 'category',
  name: 'category',
  isComputedColumn: true,
  meta: { type: 'string', sourceParams: { sourceField: 'category' } },
};

const getContext = ({
  esqlVariables = [],
  query = 'FROM logs | EVAL category = CASE(bytes > 100, "big", "small")',
  column = runtimeColumn,
  value = 'big',
  negate,
  isByReference = false,
}: {
  esqlVariables?: ESQLControlVariable[];
  query?: string;
  column?: Record<string, unknown>;
  value?: unknown;
  negate?: boolean;
  isByReference?: boolean;
} = {}) => {
  const controlApi = { setSelectedOptions: jest.fn() };
  const parentApi = {
    esqlVariables$: { value: esqlVariables },
    addNewPanel: jest.fn(),
    getChildApi: jest.fn().mockResolvedValue(controlApi),
  };
  const embeddable = {
    parentApi,
    getEditableESQLQuery: jest.fn(() => (isByReference ? undefined : query)),
    updateESQLQuery: jest.fn(),
  };
  return {
    controlApi,
    parentApi,
    embeddable,
    context: {
      embeddable,
      data: {
        negate,
        data: [
          {
            table: {
              columns: [column],
              rows: [{ [String(column.id)]: value }],
              meta: { type: 'es_ql' },
            },
            column: 0,
            row: 0,
          },
        ],
      },
    },
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAction = () => createESQLControlFromValueClickAction() as any;

describe('createESQLControlFromValueClickAction', () => {
  describe('isCompatible', () => {
    it('is compatible with a runtime column', async () => {
      expect(await getAction().isCompatible(getContext().context)).toBe(true);
    });

    it('is not compatible with a column that exists in the index', async () => {
      const { context } = getContext({
        column: {
          ...runtimeColumn,
          isComputedColumn: false,
        },
      });
      expect(await getAction().isCompatible(context)).toBe(false);
    });

    it('is not compatible with a computed column that is a renamed index field', async () => {
      const { context } = getContext({
        column: {
          ...runtimeColumn,
          meta: { type: 'string', sourceParams: { isSourceFieldFilterable: true } },
        },
      });
      expect(await getAction().isCompatible(context)).toBe(false);
    });

    it('is not compatible with date, null or aggregated columns', async () => {
      expect(
        await getAction().isCompatible(
          getContext({ column: { ...runtimeColumn, meta: { type: 'date' } } }).context
        )
      ).toBe(false);
      expect(await getAction().isCompatible(getContext({ value: null }).context)).toBe(false);
      expect(
        await getAction().isCompatible(
          getContext({
            column: {
              ...runtimeColumn,
              meta: { type: 'string', sourceParams: { operationType: 'terms' } },
            },
          }).context
        )
      ).toBe(false);
    });

    it('is not compatible with by-reference panels', async () => {
      expect(await getAction().isCompatible(getContext({ isByReference: true }).context)).toBe(
        false
      );
    });
  });

  describe('execute', () => {
    it('appends a WHERE clause and creates a control with the clicked value selected', async () => {
      const { context, embeddable, parentApi } = getContext();
      await getAction().execute(context);

      expect(embeddable.updateESQLQuery).toHaveBeenCalledWith(
        'FROM logs | EVAL category = CASE(bytes > 100, "big", "small")\n| WHERE category == ?category'
      );
      expect(parentApi.addNewPanel).toHaveBeenCalledWith(
        {
          panelType: ESQL_CONTROL,
          serializedState: expect.objectContaining({
            control_type: 'VALUES_FROM_QUERY',
            variable_name: 'category',
            variable_type: 'values',
            selected_options: ['big'],
            esql_query:
              'FROM logs | EVAL category = CASE(bytes > 100, "big", "small")\n| STATS BY category',
          }),
        },
        expect.anything()
      );
    });

    it('uses a separate excluding variable when negating', async () => {
      const { context, embeddable, parentApi } = getContext({ negate: true });
      await getAction().execute(context);

      expect(embeddable.updateESQLQuery).toHaveBeenCalledWith(
        expect.stringContaining('| WHERE category != ?category_exclude')
      );
      expect(parentApi.addNewPanel.mock.calls[0][0].serializedState).toEqual(
        expect.objectContaining({ variable_name: 'category_exclude' })
      );
    });

    it('updates the existing control instead of creating another one', async () => {
      const { context, controlApi, embeddable, parentApi } = getContext({
        esqlVariables: [
          { key: 'category', value: 'small', type: 'values', meta: { controlledBy: 'control-1' } },
        ] as ESQLControlVariable[],
      });
      await getAction().execute(context);

      expect(parentApi.addNewPanel).not.toHaveBeenCalled();
      expect(parentApi.getChildApi).toHaveBeenCalledWith('control-1');
      expect(controlApi.setSelectedOptions).toHaveBeenCalledWith(['big']);
      expect(embeddable.updateESQLQuery).toHaveBeenCalled();
    });

    it('does not append the WHERE clause twice', async () => {
      const query = 'FROM logs | EVAL category = "a"\n| WHERE category == ?category';
      const { context, embeddable } = getContext({
        query,
        esqlVariables: [
          { key: 'category', value: 'small', type: 'values', meta: { controlledBy: 'c' } },
        ] as ESQLControlVariable[],
      });
      await getAction().execute(context);

      expect(embeddable.updateESQLQuery).toHaveBeenCalledWith(query);
    });
  });
});
