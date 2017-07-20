
import { getValType } from 'plugins/kibana/management/sections/settings/lib/get_val_type';
import expect from 'expect.js';

describe('Settings', function () {
  describe('Advanced', function () {
    describe('getValType(def, val)', function () {
      it('should be a function', function () {
        expect(getValType).to.be.a(Function);
      });

      it('should return the explicitly defined type of a setting', function () {
        expect(getValType({ type: 'string' })).to.be('string');
        expect(getValType({ type: 'json' })).to.be('json');
        expect(getValType({ type: 'string', value: 5 })).to.be('string');
      });

      it('should return array if the value is an Array and there is no defined type', function () {
        expect(getValType({ type: 'string' }, [1, 2, 3])).to.be('string');
        expect(getValType({ type: 'json', value: [1, 2, 3] })).to.be('json');

        expect(getValType({ value: 'someString' }, [1, 2, 3])).to.be('array');
        expect(getValType({ value: [1, 2, 3] }, 'someString')).to.be('array');

      });

      it('should return the type of the default value if there is no type and it is not an array', function () {
        expect(getValType({ value: 'someString' })).to.be('string');
        expect(getValType({ value: 'someString' }, 42)).to.be('string');
      });

      it('should return the type of the value if the default value is null', function () {
        expect(getValType({ value: null }, 'someString')).to.be('string');
      });
    });
  });
});
