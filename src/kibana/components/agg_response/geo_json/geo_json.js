define(function (require) {
  return function TileMapConverterFn(Private, timefilter, $compile, $rootScope) {
    var _ = require('lodash');

    var readRows = require('components/agg_response/geo_json/_read_rows');
    function findCol(table, name) {
      return _.findIndex(table.columns, function (col) {
        return col.aggConfig.schema.name === name;
      });
    }

    function createGeoJson(vis, table) {
      var index = {
        geo: findCol(table, 'segment'),
        metric: findCol(table, 'metric')
      };

      var col = {
        geo: table.columns[index.geo],
        metric: table.columns[index.metric],
      };

      var agg = _.mapValues(col, function (col) {
        return col && col.aggConfig;
      });

      var chart = {};
      var geoJson = chart.geoJson = {
        type: 'FeatureCollection',
        features: []
      };

      var props = geoJson.properties = {
        label: table.title(),
        length: 0,
        min: 0,
        max: 0
      };

      // set precision from the bucketting column, if we have one
      if (agg.geo) {
        props.precision = _.parseInt(agg.geo.params.precision);
      }

      // we're all done if there are no columns
      if (!col.geo || !col.metric || !table.rows.length) return chart;

      // read the rows into the geoJson features list
      readRows(table, agg, index, chart);

      return chart;
    }

    return createGeoJson;
  };
});
