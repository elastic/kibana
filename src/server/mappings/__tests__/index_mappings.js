import expect from 'expect.js';
import Chance from 'chance';

import { IndexMappings } from '../index_mappings';
import { getRootType } from '../lib';

const chance = new Chance();

describe('server/mapping/index_mapping', function () {
  describe('constructor', () => {
    it('initializes with a default mapping when no args', () => {
      const mapping = new IndexMappings();
      const dsl = mapping.getDsl();
      expect(dsl).to.be.an('object');
      expect(getRootType(dsl)).to.be.a('string');
      expect(dsl[getRootType(dsl)]).to.be.an('object');
    });

    it('accepts a default mapping dsl as the only argument', () => {
      const mapping = new IndexMappings({
        foobar: {
          dynamic: false,
          properties: {}
        }
      });

      expect(mapping.getDsl()).to.eql({
        foobar: {
          dynamic: false,
          properties: {}
        }
      });
    });

    it('throws if root type is of type=anything-but-object', () => {
      expect(() => {
        new IndexMappings({
          root: {
            type: chance.pickone(['string', 'keyword', 'geo_point'])
          }
        });
      }).to.throwException(/non-object/);
    });

    it('throws if root type has no type and no properties', () => {
      expect(() => {
        new IndexMappings({
          root: {}
        });
      }).to.throwException(/non-object/);
    });

    it('initialized root type with properties object if not set', () => {
      const mapping = new IndexMappings({
        root: {
          type: 'object'
        }
      });

      expect(mapping.getDsl()).to.eql({
        root: {
          type: 'object',
          properties: {}
        }
      });
    });
  });

  describe('#getDsl()', () => {
    // tests are light because this method is used all over these tests
    it('returns mapping as es dsl', function () {
      const mapping = new IndexMappings();
      expect(mapping.getDsl()).to.be.an('object');
    });
  });

  describe('#addRootProperties()', () => {
    it('extends the properties of the root type', () => {
      const mapping = new IndexMappings({
        x: { properties: {} }
      });

      mapping.addRootProperties({
        y: {
          properties: {
            z: {
              type: 'text'
            }
          }
        }
      });

      expect(mapping.getDsl()).to.eql({
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
      const mapping = new IndexMappings({
        root: { properties: props }
      });

      expect(() => {
        mapping.addRootProperties(props);
      }).to.throwException(/foo/);
    });

    it('includes the plugin option in the error message when specified', () => {
      const props = { foo: 'bar' };
      const mapping = new IndexMappings({ root: { properties: props } });

      expect(() => {
        mapping.addRootProperties(props, { plugin: 'abc123' });
      }).to.throwException(/plugin abc123/);
    });
  });
});
