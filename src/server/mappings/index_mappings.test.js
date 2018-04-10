import Chance from 'chance';

import { IndexMappings } from './index_mappings';
import { getRootType } from './lib';

const chance = new Chance();

describe('server/mapping/index_mapping', function () {
  describe('constructor', () => {
    it('initializes with a default mapping when no args', () => {
      const mapping = new IndexMappings();
      const dsl = mapping.getDsl();
      expect(typeof dsl).toBe('object');
      expect(typeof getRootType(dsl)).toBe('string');
      expect(typeof dsl[getRootType(dsl)]).toBe('object');
    });

    it('accepts a default mapping dsl as the only argument', () => {
      const mapping = new IndexMappings({
        foobar: {
          dynamic: false,
          properties: {}
        }
      });

      expect(mapping.getDsl()).toEqual({
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
      }).toThrowError(/non-object/);
    });

    it('throws if root type has no type and no properties', () => {
      expect(() => {
        new IndexMappings({
          root: {}
        });
      }).toThrowError(/non-object/);
    });

    it('initialized root type with properties object if not set', () => {
      const mapping = new IndexMappings({
        root: {
          type: 'object'
        }
      });

      expect(mapping.getDsl()).toEqual({
        root: {
          type: 'object',
          properties: {}
        }
      });
    });

    it('accepts an array of new extensions that will be added to the mapping', () => {
      const initialMapping = {
        x: { properties: {} }
      };
      const extensions = [
        {
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
      ];

      const mapping = new IndexMappings(initialMapping, extensions);
      expect(mapping.getDsl()).toEqual({
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

    it('throws if any of the new properties conflict', () => {
      const initialMapping = {
        root: { properties: { foo: 'bar' } }
      };
      const extensions = [
        {
          properties: {
            foo: 'bar'
          }
        }
      ];

      expect(() => {
        new IndexMappings(initialMapping, extensions);
      }).toThrowError(/foo/);
    });

    it('includes the pluginId from the extension in the error message if defined', () => {
      const initialMapping = {
        root: { properties: { foo: 'bar' } }
      };
      const extensions = [
        {
          pluginId: 'abc123',
          properties: {
            foo: 'bar'
          }
        }
      ];

      expect(() => {
        new IndexMappings(initialMapping, extensions);
      }).toThrowError(/plugin abc123/);
    });

    it('throws if any of the new properties start with _', () => {
      const initialMapping = {
        root: { properties: { foo: 'bar' } }
      };
      const extensions = [
        {
          properties: {
            _foo: 'bar'
          }
        }
      ];

      expect(() => {
        new IndexMappings(initialMapping, extensions);
      }).toThrowErrorMatchingSnapshot();
    });

    it('includes the pluginId from the extension in the _ error message if defined', () => {
      const initialMapping = {
        root: { properties: { foo: 'bar' } }
      };
      const extensions = [
        {
          pluginId: 'abc123',
          properties: {
            _foo: 'bar'
          }
        }
      ];

      expect(() => {
        new IndexMappings(initialMapping, extensions);
      }).toThrowErrorMatchingSnapshot();
    });
  });

  describe('#getDsl()', () => {
    // tests are light because this method is used all over these tests
    it('returns mapping as es dsl', function () {
      const mapping = new IndexMappings();
      expect(typeof mapping.getDsl()).toBe('object');
    });
  });
});
