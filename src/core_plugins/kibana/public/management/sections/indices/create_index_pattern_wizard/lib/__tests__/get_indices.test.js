import { getIndices } from '../get_indices';
import successfulResponse from './api/get_indices.success.json';
import errorResponse from './api/get_indices.error.json';
import exceptionResponse from './api/get_indices.exception.json';

describe('getIndices', () => {
  it('should work in a basic case', async () => {
    const es = {
      search: () => new Promise((resolve) => resolve(successfulResponse))
    };

    const result = await getIndices(es, 'kibana', 1);
    expect(result.length).toBe(2);
    expect(result[0].name).toBe('1');
    expect(result[1].name).toBe('2');
  });

  it('should ignore ccs query-all', async () => {
    expect((await getIndices(null, '*:')).length).toBe(0);
  });

  it('should ignore a single comma', async () => {
    expect((await getIndices(null, ',')).length).toBe(0);
    expect((await getIndices(null, ',*')).length).toBe(0);
    expect((await getIndices(null, ',foobar')).length).toBe(0);
  });

  it('should trim the input', async () => {
    let index;
    const es = {
      search: jest.fn().mockImplementation(params => {
        index = params.index;
      }),
    };

    await getIndices(es, 'kibana          ', 1);
    expect(index).toBe('kibana');
  });

  it('should use the limit', async () => {
    let limit;
    const es = {
      search: jest.fn().mockImplementation(params => {
        limit = params.body.aggs.indices.terms.size;
      }),
    };

    await getIndices(es, 'kibana', 10);
    expect(limit).toBe(10);
  });

  describe('errors', () => {
    it('should handle errors gracefully', async () => {
      const es = {
        search: () => new Promise((resolve) => resolve(errorResponse))
      };

      const result = await getIndices(es, 'kibana', 1);
      expect(result.length).toBe(0);
    });

    it('should throw exceptions', async () => {
      const es = {
        search: () => { throw 'Fail'; }
      };

      await expect(getIndices(es, 'kibana', 1)).rejects.toThrow();
    });

    it('should handle index_not_found_exception errors gracefully', async () => {
      const es = {
        search: () => new Promise((resolve, reject) => reject(exceptionResponse))
      };

      const result = await getIndices(es, 'kibana', 1);
      expect(result.length).toBe(0);
    });

    it('should throw an exception if no limit is provided', async () => {
      await expect(getIndices({}, 'kibana')).rejects.toThrow();
    });
  });
});
