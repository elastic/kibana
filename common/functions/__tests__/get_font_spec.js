import expect from 'expect.js';
import { getFontSpec } from '../plot/get_font_spec';
import { fontStyle } from './fixtures/test_styles';

describe('getFontSpec', () => {
  const defaultSpec = {
    size: 12,
    style: 'normal',
    weight: 'normal',
    family: '"Open Sans", Helvetica, Arial, sans-serif',
    color: '#000',
  };

  describe('default output', () => {
    it('returns the default spec object', () => {
      expect(getFontSpec()).to.eql(defaultSpec);
    });
  });

  describe('convert from fontStyle object', () => {
    it('returns plot font spec', () => {
      expect(getFontSpec(fontStyle)).to.eql({
        size: 12,
        style: 'normal',
        weight: 'bolder',
        family: 'Chalkboard, serif',
        color: 'pink',
      });
    });
  });
});
