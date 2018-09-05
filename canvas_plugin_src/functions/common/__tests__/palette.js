import expect from 'expect.js';
import { palette } from '../palette';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { palettes } from '../../../../common/lib/palettes';

describe('palette', () => {
  const fn = functionWrapper(palette);

  it('results a palette', () => {
    const result = fn(null);
    expect(result).to.have.property('type', 'palette');
  });

  describe('args', () => {
    describe('_', () => {
      it('sets colors', () => {
        const result = fn(null, { _: ['red', 'green', 'blue'] });
        expect(result.colors).to.eql(['red', 'green', 'blue']);
      });

      it('defaults to pault_tor_14 colors', () => {
        const result = fn(null);
        expect(result.colors).to.eql(palettes.paul_tor_14.colors);
      });
    });

    describe('gradient', () => {
      it('sets gradient', () => {
        let result = fn(null, { gradient: true });
        expect(result).to.have.property('gradient', true);

        result = fn(null, { gradient: false });
        expect(result).to.have.property('gradient', false);
      });

      it('defaults to false', () => {
        const result = fn(null);
        expect(result).to.have.property('gradient', false);
      });
    });

    describe('reverse', () => {
      it('reverses order of the colors', () => {
        const result = fn(null, { reverse: true });
        expect(result.colors).to.eql(palettes.paul_tor_14.colors.reverse());
      });

      it('keeps the original order of the colors', () => {
        const result = fn(null, { reverse: false });
        expect(result.colors).to.eql(palettes.paul_tor_14.colors);
      });

      it(`defaults to 'false`, () => {
        const result = fn(null);
        expect(result.colors).to.eql(palettes.paul_tor_14.colors);
      });
    });
  });
});
