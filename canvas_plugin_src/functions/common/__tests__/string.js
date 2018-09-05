import expect from 'expect.js';
import { string } from '../string';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';

describe('string', () => {
  const fn = functionWrapper(string);

  it('casts primitive types to strings', () => {
    expect(fn(null, { _: [14000] })).to.be('14000');
    expect(fn(null, { _: ['foo'] })).to.be('foo');
    expect(fn(null, { _: [null] })).to.be('');
    expect(fn(null, { _: [true] })).to.be('true');
  });

  it('concatenates all args to one string', () => {
    expect(fn(null, { _: ['foo', 'bar', 'fizz', 'buzz'] })).to.be('foobarfizzbuzz');
    expect(fn(null, { _: ['foo', 1, true, null] })).to.be('foo1true');
  });
});
