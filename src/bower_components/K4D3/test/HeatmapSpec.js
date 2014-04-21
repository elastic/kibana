describe('Heatmap Chart Test Cases', function() {
    'use strict';

    var div, chart, cols = 50, rows = 24, data = [];
    for (var x = 1; x < cols+1; x++) {
        for (var y = 1; y < rows+1; y++) {
            data.push({ x: x, y: y, z: Math.random() });
        }
    }

    beforeEach(function() {
        div = d3.select('body').append('div').attr('id', 'heatmap');

        chart = k4.heatmap();
        div.datum(data).call(chart);
    });

    afterEach(function() {
        div.remove();
    });

    // Tests
    it('should generate svg', function() {
        expect(d3.select('svg')[0].length).not.toBe(0);
    });

    it('should set default svg height and width', function() {
        expect(div.select('svg').attr('width')).toBe('500');
        expect(div.select('svg').attr('height')).toBe('500');
    });

    it('should allow changing svg height and width', function() {
        chart.width(760).height(400);
        div.datum(data).call(chart);
        expect(div.select('svg').attr('width')).toBe('760');
        expect(div.select('svg').attr('height')).toBe('400');
    });

    it('should have random data selection with z value >= 0 && <= 1', function() {
        var n = Math.floor(Math.random()*data.length);
        expect(n).toBeGreaterThan(0);
        expect(data[n].z).not.toBeGreaterThan(1);
        expect(data[n].z).not.toBeLessThan(0);
    });

});
