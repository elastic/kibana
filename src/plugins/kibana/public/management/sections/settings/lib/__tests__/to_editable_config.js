
import toEditableConfig from 'plugins/kibana/management/sections/settings/lib/to_editable_config';
import expect from 'expect.js';

describe('Settings', function () {
  describe('Advanced', function () {
    describe('toEditableConfig(def, name, value)', function () {
      it('sets name', function () {
        expect(invoke({ name: 'who' }).name).to.equal('who');
      });

      it('sets value', function () {
        expect(invoke({ value: 'what' }).value).to.equal('what');
      });

      it('sets type', function () {
        expect(invoke({ value: 'what' }).type).to.be('string');
        expect(invoke({ value: 0 }).type).to.be('number');
        expect(invoke({ value: [] }).type).to.be('array');
      });

      context('when given a setting definition object', function () {
        let def;
        beforeEach(function () {
          def = {
            value: 'the original',
            description: 'the one and only',
            options: 'all the options'
          };
        });

        it('is not marked as custom', function () {
          expect(invoke({ def }).isCustom).to.be.false;
        });

        it('sets a default value', function () {
          expect(invoke({ def }).defVal).to.equal(def.value);
        });

        it('sets a description', function () {
          expect(invoke({ def }).description).to.equal(def.description);
        });

        it('sets options', function () {
          expect(invoke({ def }).options).to.equal(def.options);
        });

        context('that contains a type', function () {
          it('sets that type', function () {
            def.type = 'something';
            expect(invoke({ def }).type).to.equal(def.type);
          });
        });

        context('that contains a value of type array', function () {
          it('sets type to array', function () {
            def.value = [];
            expect(invoke({ def }).type).to.equal('array');
          });
        });
      });

      context('when not given a setting definition object', function () {
        it('is marked as custom', function () {
          expect(invoke().isCustom).to.be.true;
        });

        it('sets defVal to undefined', function () {
          expect(invoke().defVal).to.be.undefined;
        });

        it('sets description to undefined', function () {
          expect(invoke().description).to.be.undefined;
        });

        it('sets options to undefined', function () {
          expect(invoke().options).to.be.undefined;
        });
      });
    });
  });
});

function invoke({ def = false, name = 'woah', value = 'forreal' } = {}) {
  return toEditableConfig({ def, name, value, isCustom: def === false });
}
