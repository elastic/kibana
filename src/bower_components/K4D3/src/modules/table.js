
k4.table = function() {
    'use strict';

    var row = function(d) { return d; },
        column = function(d) { return d3.keys(d[0]); },
        columns;

    function table(selection) {
        selection.each(function(data) {

            columns = column.call(this, data);

            data = row.call(this, data);

            var table = d3.select(this).append('table')
                .attr('id', 'data-table')
                .attr('class', 'table table-striped table-bordered table-hover')
                .attr('cellpadding', 0)
                .attr('cellspacing', 0)
                .attr('border', 0)
                .style('border-collapse', 'collapse');

            var thead = table.append('thead')
                .attr('class', 'sorting');

            var tbody = table.append('tbody');
                //tfoot = table.append('tfoot');

            // append the header row
            thead.append('tr')
                .selectAll('th')
                .data(columns)
                .enter()
                .append('th')
                .text(function(column) { return column; })
                .style('border', '1px black solid')
                .style('padding', '5px');

            // create a row for each object in the data
            var rows = tbody.selectAll('tr')
                .data(data)
                .enter()
                .append('tr');

            // create a cell in each row for each column
            rows.selectAll('td')
                .data(function(row) {
                    return columns.map(function(column) {
                        return {column: column, value: row[column]};
                    });
                })
                .enter()
                .append('td')
                .text(function(d) { return d.value; })
                .style('border', '1px black solid')
                .style('padding', '5px');

            // uppercase the column headers
            table.selectAll('thead th')
                .text(function(column) {
                    return column.charAt(0).toUpperCase() + column.substr(1);
                });
        });
    }

    table.row = function(_) {
        if (!arguments.length) { return row; }
        row = _;
        return table;
    };

    table.column = function(_) {
        if (!arguments.length) { return column; }
        column = _;
        return table;
    };

    return table;
};
