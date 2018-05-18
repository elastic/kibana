import { parseQuery } from '../parse_query';

describe('getQueryText', () => {
  it('should know how to get the text out of the AST', () => {
    const ast = {
      getTermClauses: () => [{ value: 'foo' }, { value: 'bar' }],
      getFieldClauses: () => [{ value: 'lala' }, { value: 'lolo' }]
    };
    expect(parseQuery({ ast })).toEqual({ queryText: 'foo bar', visibleTypes: 'lala' });
  });
});
