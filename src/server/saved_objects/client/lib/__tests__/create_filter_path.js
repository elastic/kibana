import expect from 'expect.js';
import { createFilterPath } from '../create_filter_path';

describe('createFilterPath', () => {
  it('handles a string', () => {
    const fields = createFilterPath('foo');
    expect(fields).to.eql([
      'hits.total',
      'hits.hits._id',
      'hits.hits._type',
      'hits.hits._source.foo'
    ]);
  });

  it('handles an array', () => {
    const fields = createFilterPath(['foo', 'bar']);
    expect(fields).to.eql([
      'hits.hits._source.foo',
      'hits.hits._source.bar',
      'hits.total',
      'hits.hits._id',
      'hits.hits._type'
    ]);
  });
});
