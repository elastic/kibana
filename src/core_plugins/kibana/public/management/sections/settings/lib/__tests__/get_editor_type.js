
import { getEditorType } from 'plugins/kibana/management/sections/settings/lib/get_editor_type';
import expect from 'expect.js';

describe('Settings', function () {
  describe('Advanced', function () {
    describe('getEditorType(conf)', function () {
      describe('when given type has a named editor', function () {
        it('returns that named editor', function () {
          expect(getEditorType({ type: 'json' })).to.equal('json');
          expect(getEditorType({ type: 'array' })).to.equal('array');
          expect(getEditorType({ type: 'boolean' })).to.equal('boolean');
          expect(getEditorType({ type: 'select' })).to.equal('select');
        });
      });

      describe('when given a type of number, string, null, or undefined', function () {
        it('returns "normal"', function () {
          expect(getEditorType({ type: 'number' })).to.equal('normal');
          expect(getEditorType({ type: 'string' })).to.equal('normal');
          expect(getEditorType({ type: 'null' })).to.equal('normal');
          expect(getEditorType({ type: 'undefined' })).to.equal('normal');
        });
      });
    });
  });
});
