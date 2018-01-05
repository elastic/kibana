import expect from 'expect.js';

import { appendWildcard } from '../append_wildcard';

describe('append_wildcard', function () {
  it('should add a wildcard for an alphabet input', () => {
    [
      'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i',
      'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r',
      's', 't', 'u', 'v', 'w', 'x', 'y', 'z'
    ].forEach(char => {
      expect(appendWildcard({ key: char }, '')).to.be(`${char}*`);
      expect(appendWildcard({ key: char.toUpperCase() }, '')).to.be(`${char.toUpperCase()}*`);
    });
  });

  it('should add a wildcard for a number input', () => {
    ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].forEach(num => {
      expect(appendWildcard({ key: num }, '')).to.be(`${num}*`);
    });
  });

  it('should NOT add a wildcard for a non alphanumeric input', () => {
    ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '=', '+'].forEach(char => {
      expect(appendWildcard({ key: char }, '')).to.be(undefined);
    });
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
