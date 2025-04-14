import { of } from 'rxjs';
import { UiSettingsCommon } from '@kbn/data-views-plugin/common';
import { getEsqlFn } from './esql';
import { ExecutionContext } from '@kbn/expressions-plugin/common';
import { ESQLSearchResponse } from '@kbn/es-types';
import { IKibanaSearchResponse } from '@kbn/search-types';

describe('getEsqlFn', () => {
  it('should always return a fully serializable table', async () => {
    const mockSearch = jest.fn().mockReturnValue(
      of({
        rawResponse: {
          values: [
            ['value1'],
          ],
          columns: [
            { name: 'column1', type: 'string' },
          ],
        },
      } as IKibanaSearchResponse<ESQLSearchResponse>)
    );

    const esqlFn = getEsqlFn({
      getStartDependencies: async () => ({
        search: mockSearch,
        uiSettings: {} as UiSettingsCommon,
      }),
    });

    const input = null; // Mock input
    const args = {
      query: 'SELECT * FROM index',
    };

    const context = {
      abortSignal: new AbortController().signal,
      inspectorAdapters: {},
      getKibanaRequest: jest.fn(),
    } as unknown as ExecutionContext;

    const result = await esqlFn.fn(input, args, context).toPromise();

    expect(result?.type).toEqual('datatable');
    expect(() => JSON.stringify(result)).not.toThrow();
  });
});