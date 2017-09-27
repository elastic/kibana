import expect from 'expect.js';
import Chance from 'chance';

import { Mappings } from '../mappings';
import { getRootType } from '../lib';

const chance = new Chance();

describe('server/mapping', function () {
  describe('constructor', () => {
    it('initializes with default mappings when no args', () => {
      const mappings = new Mappings();
      const dsl = mappings.getDsl();
      expect(dsl).to.be.an('object');
      expect(getRootType(dsl)).to.be.a('string');
      expect(dsl[getRootType(dsl)]).to.be.an('object');
    });

    it('accepts default mappings dsl as the only argument', () => {
      const mappings = new Mappings({
        foobar: {
          dynamic: false,
          properties: {}
        }
      });

      expect(mappings.getDsl()).to.eql({
        foobar: {
          dynamic: false,
          properties: {}
        }
      });
    });

    it('throws if root type is of type=anything-but-object', () => {
      expect(() => {
        new Mappings({
          root: {
            type: chance.pickone(['string', 'keyword', 'geo_point'])
          }
        });
      }).to.throwException(/non-object/);
    });

    it('throws if root type has no type and no properties', () => {
      expect(() => {
        new Mappings({
          root: {}
        });
      }).to.throwException(/non-object/);
    });

    it('initialized root type with properties object if not set', () => {
      const mappings = new Mappings({
        root: {
          type: 'object'
        }
      });

      expect(mappings.getDsl()).to.eql({
        root: {
          type: 'object',
          properties: {}
        }
      });
    });
  });

  describe('#getDsl()', () => {
    // tests are light because this method is used all over these tests
    it('returns mappings as es dsl', function () {
      const mappings = new Mappings();
      expect(mappings.getDsl()).to.be.an('object');
    });
  });

  describe('#addRootProperties()', () => {
    it('extends the properties of the root type', () => {
      const mappings = new Mappings({
        x: { properties: {} }
      });

      mappings.addRootProperties({
        y: {
          properties: {
            z: {
              type: 'text'
            }
          }
        }
      });

      expect(mappings.getDsl()).to.eql({
        x: {
          properties: {
            y: {
              properties: {
                z: {
                  type: 'text'
                }
              }
            }
          }
        }
      });
    });

    it('throws if any property is conflicting', () => {
      const props = { foo: 'bar' };
      const mappings = new Mappings({
        root: { properties: props }
      });

      expect(() => {
        mappings.addRootProperties(props);
      }).to.throwException(/foo/);
    });

    it('includes the plugin option in the error message when specified', () => {
      const props = { foo: 'bar' };
      const mappings = new Mappings({ root: { properties: props } });

      expect(() => {
        mappings.addRootProperties(props, { plugin: 'abc123' });
      }).to.throwException(/plugin abc123/);
    });
  });
});
