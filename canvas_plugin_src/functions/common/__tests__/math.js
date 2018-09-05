import expect from 'expect.js';
import { math } from '../math';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { emptyTable, testTable } from './fixtures/test_tables';

describe('math', () => {
  const fn = functionWrapper(math);

  it('evaluates math expressions without reference to context', () => {
    expect(fn(null, { _: '10.5345' })).to.be(10.5345);
    expect(fn(null, { _: '123 + 456' })).to.be(579);
    expect(fn(null, { _: '100 - 46' })).to.be(54);
    expect(fn(1, { _: '100 / 5' })).to.be(20);
    expect(fn('foo', { _: '100 / 5' })).to.be(20);
    expect(fn(true, { _: '100 / 5' })).to.be(20);
    expect(fn(testTable, { _: '100 * 5' })).to.be(500);
    expect(fn(emptyTable, { _: '100 * 5' })).to.be(500);
  });

  it('evaluates math expressions with reference to the value of the context, must be a number', () => {
    expect(fn(-103, { _: 'abs(value)' })).to.be(103);
  });

  it('evaluates math expressions with references to columns in a datatable', () => {
    expect(fn(testTable, { _: 'unique(in_stock)' })).to.be(2);
    expect(fn(testTable, { _: 'sum(quantity)' })).to.be(2508);
    expect(fn(testTable, { _: 'mean(price)' })).to.be(320);
    expect(fn(testTable, { _: 'min(price)' })).to.be(67);
    expect(fn(testTable, { _: 'median(quantity)' })).to.be(256);
    expect(fn(testTable, { _: 'max(price)' })).to.be(605);
  });

  describe('args', () => {
    describe('_', () => {
      it('sets the math expression to be evaluted', () => {
        expect(fn(null, { _: '10' })).to.be(10);
        expect(fn(23.23, { _: 'floor(value)' })).to.be(23);
        expect(fn(testTable, { _: 'count(price)' })).to.be(9);
        expect(fn(testTable, { _: 'count(name)' })).to.be(9);
      });
    });
  });

  describe('invalid expressions', () => {
    it('throws when expression evaluates to an array', () => {
      expect(fn)
        .withArgs(testTable, { _: 'multiply(price, 2)' })
        .to.throwException(e => {
          expect(e.message).to.be(
            'Expressions must return a single number. Try wrapping your expression in mean() or sum()'
          );
        });
    });

    it('throws when using an unknown context variable', () => {
      expect(fn)
        .withArgs(testTable, { _: 'sum(foo)' })
        .to.throwException(e => {
          expect(e.message).to.be('Unknown variable: foo');
        });
    });

    it('throws when using non-numeric data', () => {
      expect(fn)
        .withArgs(testTable, { _: 'mean(name)' })
        .to.throwException(e => {
          expect(e.message).to.be('Failed to execute math expression. Check your column names');
        });
      expect(fn)
        .withArgs(testTable, { _: 'mean(in_stock)' })
        .to.throwException(e => {
          expect(e.message).to.be('Failed to execute math expression. Check your column names');
        });
    });

    it('throws when missing expression', () => {
      expect(fn)
        .withArgs(testTable)
        .to.throwException(e => {
          expect(e.message).to.be('Empty expression');
        });
      expect(fn)
        .withArgs(testTable, { _: '' })
        .to.throwException(e => {
          expect(e.message).to.be('Empty expression');
        });
      expect(fn)
        .withArgs(testTable, { _: ' ' })
        .to.throwException(e => {
          expect(e.message).to.be('Empty expression');
        });
    });

    it('throws when passing a context variable from an empty datatable', () => {
      expect(fn)
        .withArgs(emptyTable, { _: 'mean(foo)' })
        .to.throwException(e => {
          expect(e.message).to.be('Empty datatable');
        });
    });
  });
});
