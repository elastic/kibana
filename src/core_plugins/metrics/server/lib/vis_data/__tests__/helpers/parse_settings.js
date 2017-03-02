import { expect } from 'chai';
import parseSettings from '../../helpers/parse_settings';

describe('parseSettings', () => {
  it('returns the true for "true"', () => {
    const settings = 'pad=true';
    expect(parseSettings(settings)).to.eql({
      pad: true,
    });
  });

  it('returns the false for "false"', () => {
    const settings = 'pad=false';
    expect(parseSettings(settings)).to.eql({
      pad: false,
    });
  });

  it('returns the true for "true"', () => {
    const settings = 'pad=true';
    expect(parseSettings(settings)).to.eql({
      pad: true,
    });
  });

  it('returns the true for 1', () => {
    const settings = 'pad=1';
    expect(parseSettings(settings)).to.eql({
      pad: true,
    });
  });

  it('returns the false for 0', () => {
    const settings = 'pad=0';
    expect(parseSettings(settings)).to.eql({
      pad: false,
    });
  });

  it('returns the settings as an object', () => {
    const settings = 'alpha=0.9 beta=0.4 gamma=0.2 period=5 pad=false type=add';
    expect(parseSettings(settings)).to.eql({
      alpha: 0.9,
      beta: 0.4,
      gamma: 0.2,
      period: 5,
      pad: false,
      type: 'add'
    });
  });
});
