define(function (require) {
  return function VislibVisBuildChartData(Private) {
    var aggResponse = Private(require('components/agg_response/index'));
    var Table = Private(require('components/agg_response/tabify/_table'));

    return function (esResponse) {
      var vis = this.vis;

      if (vis.isHierarchical()) {
        // the hierarchical converter is very self-contained (woot!)
        return aggResponse.hierarchical(vis, esResponse);
      }

      var tableGroup = aggResponse.tabify(this.vis, esResponse, {
        canSplit: true,
        asAggConfigResults: true
      });
      var converted = convertTableGroup(vis, tableGroup);

      converted.hits = esResponse.hits.total;

      return converted;
    };

    function convertTableGroup(vis, tableGroup) {
      var tables = tableGroup.tables;
      var firstChild = tables[0];
      if (firstChild instanceof Table) {

        var chart = convertTable(vis, firstChild);
        // if chart is within a split, assign group title to its label
        if (tableGroup.$parent) {
          chart.label = tableGroup.title;
        }
        return chart;
      }

      var out = {};
      var outList;

      tables.forEach(function (table) {
        if (!outList) {
          var aggConfig = table.aggConfig;
          var direction = aggConfig.params.row ? 'rows' : 'columns';
          outList = out[direction] = [];
        }

        outList.push(convertTableGroup(vis, table));
      });

      if (!tables.length) {
        // mimic a row of tables that doesn't have any tables
        // https://github.com/elasticsearch/kibana/blob/7bfb68cd24ed42b1b257682f93c50cd8d73e2520/src/kibana/components/vislib/components/zero_injection/inject_zeros.js#L32
        out.rows = [];
      }

      return out;
    }

    function convertTable(vis, table) {
      return vis.type.responseConverter(vis, table);
    }
  };
});