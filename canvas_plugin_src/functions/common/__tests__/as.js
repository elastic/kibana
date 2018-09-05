import expect from 'expect.js';
import { asFn } from '../as';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';

describe('as', () => {
  const fn = functionWrapper(asFn);

  it('returns a datatable with a single column and single row', () => {
    expect(fn('foo', { _: 'bar' })).to.eql({
      type: 'datatable',
      columns: [{ name: 'bar', type: 'string' }],
      rows: [{ bar: 'foo' }],
    });

    expect(fn(2, { _: 'num' })).to.eql({
      type: 'datatable',
      columns: [{ name: 'num', type: 'number' }],
      rows: [{ num: 2 }],
    });

    expect(fn(true, { _: 'bool' })).to.eql({
      type: 'datatable',
      columns: [{ name: 'bool', type: 'boolean' }],
      rows: [{ bool: true }],
    });
  });

  describe('args', () => {
    describe('_', () => {
      it('sets the column name of the resulting datatable', () => {
        expect(fn(null, { _: 'foo' }).columns[0].name).to.eql('foo');
      });

      it("returns a datatable with the column name 'value'", () => {
        expect(fn(null).columns[0].name).to.eql('value');
      });
    });
  });
});
