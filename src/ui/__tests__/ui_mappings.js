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
      const register = () => mappingsCollection.register({ foo: 'bar' }, { plugin: 'abc123' });
      register();
      expect(register).to.throwException(e => {
        expect(e.message).to.contain('abc123');
      });
    });
  });

});
