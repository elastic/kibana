import { expect } from 'chai';
import tickFormatter from '../tick_formatter';

describe('tickFormatter(format, template)', () => {

  it('returns a number with two decimal place by default', () => {
    const fn = tickFormatter();
    expect(fn(1.5556)).to.equal('1.56');
  });

  it('returns a percent with percent formatter', () => {
    const fn = tickFormatter('percent');
    expect(fn(0.5556)).to.equal('55.56%');
  });

  it('returns a byte formatted string with byte formatter', () => {
    const fn = tickFormatter('bytes');
    expect(fn(1500 ^ 10)).to.equal('1.5KB');
  });

  it('returns a custom forrmatted string with custom formatter', () => {
    const fn = tickFormatter('0.0a');
    expect(fn(1500)).to.equal('1.5k');
  });

  it('returns a custom forrmatted string with custom formatter and template', () => {
    const fn = tickFormatter('0.0a', '{{value}}/s');
    expect(fn(1500)).to.equal('1.5k/s');
  });

  it('returns zero if passed a string', () => {
    const fn = tickFormatter();
    expect(fn('100')).to.equal('0');
  });

  it('returns value if passed a bad formatter', () => {
    const fn = tickFormatter('102');
    expect(fn(100)).to.equal('100');
  });

  it('returns formatted value if passed a bad template', () => {
    const fn = tickFormatter('number', '{{value');
    expect(fn(1.5556)).to.equal('1.56');
  });


});
