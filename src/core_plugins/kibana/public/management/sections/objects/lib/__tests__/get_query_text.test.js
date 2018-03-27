import { getQueryText } from '../get_query_text';

describe('getQueryText', () => {
  it('should know how to get the text out of the AST', () => {
    const ast = {
      getTermClauses: () => [{ value: 'foo' }, { value: 'bar' }],
    };
    expect(getQueryText({ ast })).toEqual('foo bar');
  });
});
