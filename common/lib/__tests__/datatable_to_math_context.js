import expect from 'expect.js';
import { datatableToMathContext } from '../datatable_to_math_context';
import { emptyTable, testTable } from '../../functions/__tests__/fixtures/test_tables';
describe('datatableToMathContext', () => {
  it('empty table', () => {
    expect(datatableToMathContext(emptyTable)).to.be.eql({});
  });
  it('filters out non-numeric columns and pivots datatable', () => {
    expect(datatableToMathContext(testTable)).to.be.eql({
      price: [605, 583, 420, 216, 200, 190, 67, 311, 288],
      quantity: [100, 200, 300, 350, 256, 231, 240, 447, 384],
    });
  });
});
