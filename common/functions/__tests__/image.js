import expect from 'expect.js';
import { image } from '../image';
import { functionWrapper } from '../../../__tests__/helpers/function_wrapper';
import { elasticLogo } from '../image/elastic_logo';
import { elasticOutline } from '../repeatImage/elastic_outline';

describe('image', () => {
  const fn = functionWrapper(image);

  it('returns an image object using a dataUrl', () => {
    const result = fn(null, { dataurl: elasticOutline, mode: 'cover' });
    expect(result).to.have.property('type', 'image');
  });

  describe('args', () => {
    describe('dataurl', () => {
      it('sets the source of the image', () => {
        const result = fn(null, { dataurl: elasticOutline });
        expect(result).to.have.property('dataurl', elasticOutline);
      });

      it('defaults to the elasticLogo if not provided', () => {
        const result = fn(null);
        expect(result).to.have.property('dataurl', elasticLogo);
      });
    });

    describe('mode', () => {
      it('sets the mode', () => {
        it('returns an image object using a dataUrl', () => {
          const result = fn(null, { mode: 'contain' });
          expect(result).to.have.property('mode', 'contain');
        });

        it('returns an image object using a dataUrl', () => {
          const result = fn(null, { mode: 'cover' });
          expect(result).to.have.property('mode', 'cover');
        });

        it('returns an image object using a dataUrl', () => {
          const result = fn(null, { mode: 'stretch' });
          expect(result).to.have.property('mode', 'stretch');
        });
      });

      it("defaults to 'contain' if not provided", () => {
        const result = fn(null);
        expect(result).to.have.property('mode', 'contain');
      });
    });
  });
});
