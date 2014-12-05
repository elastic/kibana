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
      var child = tableGroup.tables[0];
      if (child instanceof Table) {
        return convertTable(vis, child);
      }

      var out = {};
      var outList;
      tableGroup.tables.forEach(function (table) {
        if (!outList) {
          var aggConfig = table.aggConfig;
          var direction = aggConfig.params.row ? 'rows' : 'columns';
          outList = out[direction] = [];
        }

        outList.push(convertTableGroup(vis, table));
      });

      return out;
    }

    function convertTable(vis, table) {
      return vis.type.responseConverter(vis, table);
    }
  };
});