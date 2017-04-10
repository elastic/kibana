import expect from 'expect.js';
import sinon from 'sinon';
import { has } from 'lodash';
import { KibanaMappings } from '../kibana_index_mappings';


describe('plugins/elasticsearch', function () {
  describe('lib/kibana_index_mappings', function () {
    let kibanaMappings;
    const plugin = {
      status: {
        red: sinon.stub()
      }
    };
    beforeEach(function () {
      kibanaMappings = new KibanaMappings(plugin);
    });

    it('provides default mappings', function () {
      expect(kibanaMappings.getCombined()).to.be.an('object');
    });

    it('registers new mappings', () => {
      kibanaMappings.register({
        foo: {
          'properties': {
            'bar': {
              'type': 'text'
            }
          }
        }
      });

      const mappings = kibanaMappings.getCombined();
      expect(has(mappings, 'foo.properties.bar')).to.be(true);
    });

    it('sets the plugin red if there is a mapping conflict', () => {
      kibanaMappings.register({ foo: 'bar' });
      kibanaMappings.register({ foo: 'bar' });
      expect(plugin.status.red.called).to.be(true);
    });
  });
});
