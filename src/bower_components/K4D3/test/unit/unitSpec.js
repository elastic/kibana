describe('Unit tests', function() {
    'use strict';

    var chart,
        data,
        div,
        formatDate;

    // Tests
    describe('Area Chart Test Cases', function() {
        beforeEach(function() {
            formatDate = d3.time.format("%b %Y").parse;
            data = [
                {x: "Jan 2013", y: 256},
                {x: "Feb 2013", y: 770},
                {x: "May 2013", y: 159},
                {x: "Oct 2013", y: 106}
            ];

            div = d3.select('body').append('div').attr('id', 'chart');

            chart = k4.area()
                .interpolate("cardinal")
                .x(function(d) { return formatDate(d.x); })
                .y(function(d) { return d.y; });

            div.datum(data).call(chart);
        });

        afterEach(function() {
            div.remove();
        });

        it('should generate svg', function() {
            expect(d3.select('svg')[0][0]).not.toBe('undefined');
        });

        it('should set default svg height and width', function() {
            expect(div.select('svg').attr('width')).toBe('960');
            expect(div.select('svg').attr('height')).toBe('500');
        });

        it('should allow changing svg height and width', function() {
            chart.width(1160).height(450);
            div.datum(data).call(chart);

            expect(div.select('svg').attr('width')).toBe('1160');
            expect(div.select('svg').attr('height')).toBe('450');
        });
    });

    describe('Pie Chart Test Cases', function() {
        beforeEach(function() {
            data = [
                {label: "DEN", value: 256},
                {label: "SEA", value: 770},
                {label: "SF", value: 159},
                {label: "NE", value: 106}
            ];

            div = d3.select('body').append('div').attr('id', 'chart');

            chart = k4.pie()
                .label(function(d) { return d.label; })
                .value(function(d) { return d.value; });

            div.datum(data).call(chart);
        });

        afterEach(function() {
            div.remove();
        });

        // Tests
        it('should generate svg', function() {
            expect(d3.select('svg')[0][0]).not.toBe('undefined');
        });

        it('should set default svg height and width', function() {
            expect(div.select('svg').attr('width')).toBe('500');
            expect(div.select('svg').attr('height')).toBe('500');
        });

        it('should allow changing svg height and width', function() {
            chart.width(1160).height(450);
            div.datum(data).call(chart);

            expect(div.select('svg').attr('width')).toBe('1160');
            expect(div.select('svg').attr('height')).toBe('450');
        });
    });

    describe('Line Chart Test Cases', function() {
        beforeEach(function() {
            formatDate = d3.time.format("%b %Y").parse;
            data = [
                {x: "Jan 2013", y: 256},
                {x: "Feb 2013", y: 770},
                {x: "May 2013", y: 159},
                {x: "Oct 2013", y: 106}
            ];

            div = d3.select('body').append('div').attr('id', 'chart');

            chart = k4.line()
                .interpolate("cardinal")
                .x(function(d) { return formatDate(d.x); })
                .y(function(d) { return d.y; });

            div.datum(data).call(chart);
        });

        afterEach(function() {
            div.remove();
        });

        it('should generate svg', function() {
            expect(d3.select('svg')[0][0]).not.toBe('undefined');
        });

        it('should set default svg height and width', function() {
            expect(div.select('svg').attr('width')).toBe('960');
            expect(div.select('svg').attr('height')).toBe('500');
        });

        it('should allow changing svg height and width', function() {
            chart.width(1160).height(450);
            div.datum(data).call(chart);

            expect(div.select('svg').attr('width')).toBe('1160');
            expect(div.select('svg').attr('height')).toBe('450');
        });
    });

    describe('Sparkline Chart Test Cases', function() {
        beforeEach(function() {
            formatDate = d3.time.format("%b %Y").parse;
            data = [
                {x: "Jan 2013", y: 256},
                {x: "Feb 2013", y: 770},
                {x: "May 2013", y: 159},
                {x: "Oct 2013", y: 106}
            ];

            div = d3.select('body').append('div').attr('id', 'chart');

            chart = k4.sparkline()
                .interpolate("cardinal")
                .x(function(d) { return formatDate(d.x); })
                .y(function(d) { return d.y; });

            div.datum(data).call(chart);
        });

        afterEach(function() {
            div.remove();
        });

        it('should generate svg', function() {
            expect(d3.select('svg')[0][0]).not.toBe('undefined');
        });

        it('should set default svg height and width', function() {
            expect(div.select('svg').attr('width')).toBe('760');
            expect(div.select('svg').attr('height')).toBe('120');
        });

        it('should allow changing svg height and width', function() {
            chart.width(1160).height(450);
            div.datum(data).call(chart);

            expect(div.select('svg').attr('width')).toBe('1160');
            expect(div.select('svg').attr('height')).toBe('450');
        });
    });
});
