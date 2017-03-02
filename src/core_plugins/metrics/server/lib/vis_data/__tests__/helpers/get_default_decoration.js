import { expect } from 'chai';
import getDefaultDecoration from '../../helpers/get_default_decoration';

describe('getDefaultDecoration', () => {

  describe('lines', () => {
    it('return decoration for lines', () => {
      const series = {
        point_size: 10,
        chart_type: 'line',
        line_width: 10,
        fill: 1
      };
      const result = getDefaultDecoration(series);
      expect(result.lines)
        .to.have.property('show', true);
      expect(result.lines)
        .to.have.property('fill', 1);
      expect(result.lines)
        .to.have.property('lineWidth', 10);
      expect(result.points)
        .to.have.property('show', true);
      expect(result.points)
        .to.have.property('radius', 1);
      expect(result.points)
        .to.have.property('lineWidth', 10);
      expect(result.bars)
        .to.have.property('show', false);
      expect(result.bars)
        .to.have.property('fill', 1);
      expect(result.bars)
        .to.have.property('lineWidth', 10);
    });

    it('return decoration for lines without points', () => {
      const series = {
        chart_type: 'line',
        line_width: 10,
        fill: 1
      };
      const result = getDefaultDecoration(series);
      expect(result.points)
        .to.have.property('show', true);
      expect(result.points)
        .to.have.property('lineWidth', 10);
    });

    it('return decoration for lines with points set to zero (off)', () => {
      const series = {
        chart_type: 'line',
        line_width: 10,
        fill: 1,
        point_size: 0
      };
      const result = getDefaultDecoration(series);
      expect(result.points)
        .to.have.property('show', false);
    });

    it('return decoration for lines (off)', () => {
      const series = {
        chart_type: 'line',
        line_width: 0,
      };
      const result = getDefaultDecoration(series);
      expect(result.lines)
        .to.have.property('show', false);
    });
  });

  describe('bars', () => {

    it('return decoration for bars', () => {
      const series = {
        chart_type: 'bar',
        line_width: 10,
        fill: 1
      };
      const result = getDefaultDecoration(series);
      expect(result.lines)
        .to.have.property('show', false);
      expect(result.points)
        .to.have.property('show', false);
      expect(result.bars)
        .to.have.property('show', true);
      expect(result.bars)
        .to.have.property('fill', 1);
      expect(result.bars)
        .to.have.property('lineWidth', 10);
    });

  });

});

