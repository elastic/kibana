import expect from 'expect.js';
import { includedFields } from '../included_fields';

describe('includedFields', () => {
  it('returns undefined if fields are not provided', () => {
    expect(includedFields()).to.be(undefined);
  });

  it('includes type', () => {
    const fields = includedFields('config', 'foo');
    expect(fields).to.have.length(3);
    expect(fields).to.contain('type');
  });

  it('accepts field as string', () => {
    const fields = includedFields('config', 'foo');
    expect(fields).to.have.length(3);
    expect(fields).to.contain('config.foo');
  });

  it('accepts fields as an array', () => {
    const fields = includedFields('config', ['foo', 'bar']);

    expect(fields).to.have.length(5);
    expect(fields).to.contain('config.foo');
    expect(fields).to.contain('config.bar');
  });

  it('uses wildcard when type is not provided', () => {
    const fields = includedFields(undefined, 'foo');
    expect(fields).to.have.length(3);
    expect(fields).to.contain('*.foo');
  });

  describe('v5 compatibility', () => {
    it('includes legacy field path', () => {
      const fields = includedFields('config', ['foo', 'bar']);

      expect(fields).to.have.length(5);
      expect(fields).to.contain('foo');
      expect(fields).to.contain('bar');
    });
  });
});
