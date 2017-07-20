import expect from 'expect.js';
import { metadata } from 'ui/metadata';
describe('ui/metadata', () => {


  it('is same data as window.__KBN__', () => {
    expect(metadata.version).to.equal(window.__KBN__.version);
    expect(metadata.vars.kbnIndex).to.equal(window.__KBN__.vars.kbnIndex);
  });

  it('is immutable', () => {
    expect(() => metadata.foo = 'something').to.throw;
    expect(() => metadata.version = 'something').to.throw;
    expect(() => metadata.vars = {}).to.throw;
    expect(() => metadata.vars.kbnIndex = 'something').to.throw;
  });
});
