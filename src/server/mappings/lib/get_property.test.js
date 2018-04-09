import { getProperty } from './get_property';

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

function runTest(key, mapping) {
  expect(typeof key === 'string' || Array.isArray(key)).toBeTruthy();
  expect(typeof mapping).toBe('object');

  expect(getProperty(MAPPINGS, key)).toBe(mapping);
}

describe('getProperty(mappings, path)', () => {
  describe('string key', () => {
    it('finds root properties', () => {
      runTest('foo', MAPPINGS.rootType.properties.foo);
    });
    it('finds nested properties', () => {
      runTest('foo.name', MAPPINGS.rootType.properties.foo.properties.name);
      runTest('foo.description', MAPPINGS.rootType.properties.foo.properties.description);
      runTest('bar.baz', MAPPINGS.rootType.properties.bar.properties.baz);
    });
    it('finds nested multi-fields', () => {
      runTest('bar.baz.box', MAPPINGS.rootType.properties.bar.properties.baz.fields.box);
    });
  });
  describe('array of string keys', () => {
    it('finds root properties', () => {
      runTest(['foo'], MAPPINGS.rootType.properties.foo);
    });
    it('finds nested properties', () => {
      runTest(['foo', 'name'], MAPPINGS.rootType.properties.foo.properties.name);
      runTest(['foo', 'description'], MAPPINGS.rootType.properties.foo.properties.description);
      runTest(['bar', 'baz'], MAPPINGS.rootType.properties.bar.properties.baz);
    });
    it('finds nested multi-fields', () => {
      runTest(['bar', 'baz', 'box'], MAPPINGS.rootType.properties.bar.properties.baz.fields.box);
    });
  });
});
