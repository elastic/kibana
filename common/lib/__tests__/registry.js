import expect from 'expect.js';
import { Registry } from '../registry';

function validateRegistry(registry, elements) {
  it('gets items by lookup property', () => {
    expect(registry.get('__test2')).to.eql(elements[1]);
  });

  it('gets a shallow clone', () => {
    expect(registry.get('__test2')).to.not.equal(elements[1]);
  });

  it('is null with no match', () => {
    expect(registry.get('@@nope_nope')).to.be(null);
  });

  it('returns shallow clone of the whole registry via toJS', () => {
    const regAsJs = registry.toJS();
    expect(regAsJs).to.eql({
      __test1: elements[0],
      __test2: elements[1],
    });
    expect(regAsJs.__test1).to.eql(elements[0]);
    expect(regAsJs.__test1).to.not.equal(elements[0]);
  });

  it('resets the registry', () => {
    expect(registry.get('__test2')).to.eql(elements[1]);
    registry.reset();
    expect(registry.get('__test2')).to.equal(null);
  });
}

describe('Registry', () => {
  describe('name registry', () => {
    const elements = [{
      name: '__test1',
      prop1: 'some value',
    }, {
      name: '__test2',
      prop2: 'some other value',
      type: 'unused',
    }];

    const registry = new Registry();
    registry.register(elements[0]);
    registry.register(elements[1]);

    validateRegistry(registry, elements);

    it('throws when object is missing the lookup prop', () => {
      const check = () => registry.register({ hello: 'world' });
      expect(check).to.throwException(/requires an object with a name property/i);
    });
  });

  describe('type registry', () => {
    const elements = [{
      type: '__test1',
      prop1: 'some value',
    }, {
      type: '__test2',
      prop2: 'some other value',
      name: 'unused',
    }];

    const registry = new Registry('type');
    registry.register(elements[0]);
    registry.register(elements[1]);

    validateRegistry(registry, elements);

    it('throws when object is missing the lookup prop', () => {
      const check = () => registry.register({ hello: 'world' });
      expect(check).to.throwException(/requires an object with a type property/i);
    });
  });
});
