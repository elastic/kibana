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

      chart.tooltipFormatter = function (feature) {
        var lat = feature.geometry.coordinates[1];
        var lng = feature.geometry.coordinates[0];

        var content = '<table class="ng-scope"><tbody>' +
        '<tr><td><b>' + feature.properties.valueLabel + ': </b></td>' +
        '<td>' + feature.properties.count + '</td></tr>' +
        '<tr><td><b>Center: </b></td>' +
        '<td>' + lat.toFixed(3) + ', ' + lng.toFixed(3) + '</td></tr>' +
        '</tbody></table>';

        return content;
      };

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
