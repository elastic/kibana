import expect from 'expect.js';

import { appendWildcard } from '../append_wildcard';

describe('append_wildcard', function () {
  it('should add a wildcard for an alphabet input', () => {
    expect(appendWildcard({ key: 'a' }, '')).to.be('a*');
  });

  it('should add a wildcard for a number input', () => {
    expect(appendWildcard({ key: '8' }, '')).to.be('8*');
  });

  it('should NOT add a wildcard for a non alphanumeric input', () => {
    expect(appendWildcard({ key: '-' }, '')).to.be(undefined);
  });

  it('should NOT add a wildcard for multi-length input', () => {
    expect(appendWildcard({ key: 'Tab' }, '')).to.be(undefined);
  });

  it('should NOT add a wildcard if the value is longer than 1 character', () => {
    expect(appendWildcard({ key: 'a' }, 'b')).to.be(undefined);
  });

  it('should NOT add a wildcard if the input is a wildcard', () => {
    expect(appendWildcard({ key: '*' }, '')).to.be(undefined);
  });
});
