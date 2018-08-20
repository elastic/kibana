import expect from 'expect.js';
import { defaultSpec, getFontSpec } from '../plot/get_font_spec';
import { fontStyle } from './fixtures/test_styles';

describe('getFontSpec', () => {
  describe('default output', () => {
    it('returns the default spec object', () => {
      expect(getFontSpec()).to.eql(defaultSpec);
    });
  });

  describe('convert from fontStyle object', () => {
    it('returns plot font spec', () => {
      expect(getFontSpec(fontStyle)).to.eql({
        size: 14,
        lHeight: 21,
        style: 'normal',
        weight: 'bolder',
        family: 'Chalkboard, serif',
        color: 'pink',
      });
    });
  });
});
