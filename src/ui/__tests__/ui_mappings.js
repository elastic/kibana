import expect from 'expect.js';
import { has } from 'lodash';
import { MappingsCollection } from '../ui_mappings';


describe('UiExports', function () {
  describe('MappingsCollection', function () {
    let mappingsCollection;
    beforeEach(() => {
      mappingsCollection = new MappingsCollection();
    });

    it('provides default mappings', function () {
      expect(mappingsCollection.getCombined()).to.be.an('object');
    });

    it('registers new mappings', () => {
      mappingsCollection.register({
        foo: {
          'properties': {
            'bar': {
              'type': 'text'
            }
          }
        }
      });

      const mappings = mappingsCollection.getCombined();
      expect(has(mappings, 'foo.properties.bar')).to.be(true);
    });

    it('throws and includes the plugin id in the mapping conflict message', () => {
      const mappings = { foo: 'bar' };
      const plugin = { plugin: 'abc123' };
      mappingsCollection.register(mappings, plugin);
      expect(mappingsCollection.register).withArgs(mappings, plugin).to.throwException(/abc123/);
    });
  });

});
