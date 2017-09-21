import expect from 'expect.js';

import { getProperty } from '../get_property';

const MAPPINGS = {
  rootType: {
    properties: {
      foo: {
        properties: {
          name: {
            type: 'text'
          },
          description: {
            type: 'text'
          }
        }
      },
      bar: {
        properties: {
          baz: {
            type: 'text',
            fields: {
              box: {
                type: 'keyword'
              }
            }
          }
        }
      }
    }
  }
};

function test(key, mapping) {
  expect(typeof key === 'string' || Array.isArray(key)).to.be.ok();
  expect(mapping).to.be.an('object');

  expect(getProperty(MAPPINGS, key)).to.be(mapping);
}

describe('getProperty(mappings, path)', () => {
  describe('string key', () => {
    it('finds root properties', () => {
      test('foo', MAPPINGS.rootType.properties.foo);
    });
    it('finds nested properties', () => {
      test('foo.name', MAPPINGS.rootType.properties.foo.properties.name);
      test('foo.description', MAPPINGS.rootType.properties.foo.properties.description);
      test('bar.baz', MAPPINGS.rootType.properties.bar.properties.baz);
    });
    it('finds nested multi-fields', () => {
      test('bar.baz.box', MAPPINGS.rootType.properties.bar.properties.baz.fields.box);
    });
  });
  describe('array of string keys', () => {
    it('finds root properties', () => {
      test(['foo'], MAPPINGS.rootType.properties.foo);
    });
    it('finds nested properties', () => {
      test(['foo', 'name'], MAPPINGS.rootType.properties.foo.properties.name);
      test(['foo', 'description'], MAPPINGS.rootType.properties.foo.properties.description);
      test(['bar', 'baz'], MAPPINGS.rootType.properties.bar.properties.baz);
    });
    it('finds nested multi-fields', () => {
      test(['bar', 'baz', 'box'], MAPPINGS.rootType.properties.bar.properties.baz.fields.box);
    });
  });
});
