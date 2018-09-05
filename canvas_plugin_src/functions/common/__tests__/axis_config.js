import expect from 'expect.js';
import { axisConfig } from '../axisConfig';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { testTable } from '../__tests__/fixtures/test_tables';

describe('axisConfig', () => {
  const fn = functionWrapper(axisConfig);

  it('returns an axisConfig', () => {
    const result = fn(testTable, { show: true, position: 'right' });
    expect(result).to.have.property('type', 'axisConfig');
  });

  describe('args', () => {
    describe('show', () => {
      it('hides labels', () => {
        const result = fn(testTable, { show: false });
        expect(result).to.have.property('show', false);
      });

      it('shows labels', () => {
        const result = fn(testTable, { show: true });
        expect(result).to.have.property('show', true);
      });

      it('defaults to true', () => {
        const result = fn(testTable);
        expect(result).to.have.property('show', true);
      });
    });

    describe('position', () => {
      it('sets the position of the axis labels', () => {
        let result = fn(testTable, { position: 'left' });
        expect(result).to.have.property('position', 'left');

        result = fn(testTable, { position: 'top' });
        expect(result).to.have.property('position', 'top');

        result = fn(testTable, { position: 'right' });
        expect(result).to.have.property('position', 'right');

        result = fn(testTable, { position: 'bottom' });
        expect(result).to.have.property('position', 'bottom');
      });

      it('defaults to an empty string if not provided', () => {
        const result = fn(testTable);
        expect(result).to.have.property('position', '');
      });

      it('throws when given an invalid position', () => {
        expect(fn)
          .withArgs(testTable, { position: 'foo' })
          .to.throwException(e => {
            expect(e.message).to.be('Invalid position foo');
          });
      });
    });
  });
});
