import { expect } from 'chai';
import { htmlIdGenerator } from '../html_id_generator';

describe('htmlIdGenerator', () => {

  it('should return a function', () => {
    const fn = htmlIdGenerator();
    expect(fn).to.be.a('function');
  });

  it('should return an id ending with the specified suffix', () => {
    expect(htmlIdGenerator()('suf')).to.match(/suf$/);
  });

  it('should return an id beginning with the specified prefix', () => {
    expect(htmlIdGenerator('pref')('foo')).to.match(/^pref/);
  });

  it('should create the same id for the same suffix', () => {
    const idGenerator = htmlIdGenerator();
    expect(idGenerator('foo')).to.equal(idGenerator('foo'));
  });

  it('should create different ids for different suffixes', () => {
    const idGenerator = htmlIdGenerator();
    expect(idGenerator('foo')).not.to.equal(idGenerator('bar'));
  });

  it('should generate different ids on different instances', () => {
    const idGenerator1 = htmlIdGenerator();
    const idGenerator2 = htmlIdGenerator();
    expect(idGenerator1('foo')).not.to.equal(idGenerator2('foo'));
  });

});
