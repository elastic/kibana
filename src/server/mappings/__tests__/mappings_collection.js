import expect from 'expect.js';
import { MappingsCollection } from '../mappings_collection';

describe('server/mappings/mappings_collection', function () {
  describe('constructor', () => {
    it('accepts the rootType as first constructor argument', () => {
      const mappings = new MappingsCollection('foobar');
      expect(mappings.getCombined()).to.eql({
        foobar: {
          dynamic: false,
          properties: {}
        }
      });
    });

    it('accepts default properties as second constructor argument', () => {
      const mappings = new MappingsCollection('t', {
        foo: {},
        bar: {},
      });

      expect(mappings.getCombined()).to.eql({
        t: {
          dynamic: false,
          properties: {
            foo: {},
            bar: {}
          }
        }
      });
    });
  });

  describe('#getCombined()', () => {
    it('provides default mappings', function () {
      const mappings = new MappingsCollection();
      expect(mappings.getCombined()).to.be.an('object');
    });
  });

  describe('#register()', () => {
    it('extends the properties of the root type', () => {
      const mappings = new MappingsCollection('x');

      mappings.register({
        y: {
          properties: {
            z: {
              type: 'text'
            }
          }
        }
      });

      expect(mappings.getCombined()).to.eql({
        x: {
          dynamic: false,
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
      const mappings = new MappingsCollection('root', props);

      expect(() => {
        mappings.register(props);
      }).to.throwException(/foo/);
    });

    it('includes the plugin option in the error message when specified', () => {
      const props = { foo: 'bar' };
      const mappings = new MappingsCollection('root', props);

      expect(() => {
        mappings.register(props, { plugin: 'abc123' });
      }).to.throwException(/plugin abc123/);
    });
  });
});
