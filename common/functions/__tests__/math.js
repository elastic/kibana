import expect from 'expect.js';
import { math } from '../math';
import { emptyTable, testTable } from './fixtures/test_tables';

describe('math', () => {
  const fn = math().fn;
  describe('spec', () => {
    it('is a function', () => {
      expect(math).to.be.a('function');
    });
  });

  describe('function', () => {
    it('is a function', () => {
      expect(fn).to.be.a('function');
    });

    it('math expressions, no context', () => {
      expect(fn(null, { _: '10' })).to.be.equal(10);
      expect(fn(null, { _: '10.5345' })).to.be.equal(10.5345);
      expect(fn(null, { _: '123 + 456' })).to.be.equal(579);
      expect(fn(null, { _: '100 - 46' })).to.be.equal(54);
      expect(fn(1, { _: '100 / 5' })).to.be.equal(20);
      expect(fn('foo', { _: '100 / 5' })).to.be.equal(20);
      expect(fn(true, { _: '100 / 5' })).to.be.equal(20);
      expect(fn(testTable, { _: '100 * 5' })).to.be.equal(500);
      expect(fn(emptyTable, { _: '100 * 5' })).to.be.equal(500);
    });

    it('math expressions, context as number', () => {
      expect(fn(23.23, { _: 'floor(value)' })).to.be.equal(23);
      expect(fn(-103, { _: 'abs(value)' })).to.be.equal(103);
    });

    it('math expressions, context as datatable', () => {
      expect(fn(testTable, { _: 'count(price)' })).to.be.equal(9);
      expect(fn(testTable, { _: 'count(name)' })).to.be.equal(9);
      expect(fn(testTable, { _: 'unique(in_stock)' })).to.be.equal(2);
      expect(fn(testTable, { _: 'sum(quantity)' })).to.be.equal(2508);
      expect(fn(testTable, { _: 'mean(price)' })).to.be.equal(320);
      expect(fn(testTable, { _: 'min(price)' })).to.be.equal(67);
      expect(fn(testTable, { _: 'median(quantity)' })).to.be.equal(256);
      expect(fn(testTable, { _: 'max(price)' })).to.be.equal(605);
    });
  });

  describe('invalid expression', () => {
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
        .withArgs(testTable, { _: '' })
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
