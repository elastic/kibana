define(function (require) {
  return function TileMapVisType(Private, getAppState, courier, config) {
    const VislibVisType = Private(require('ui/vislib_vis_type/VislibVisType'));
    const Schemas = Private(require('ui/Vis/Schemas'));
    const geoJsonConverter = Private(require('ui/agg_response/geo_json/geo_json'));
    const _ = require('lodash');
    const supports = require('ui/utils/supports');

    return new VislibVisType({
      name: 'tile_map',
      title: 'Tile map',
      icon: 'fa-map-marker',
      description: 'Your source for geographic maps. Requires an elasticsearch geo_point field. More specifically, a field ' +
       'that is mapped as type:geo_point with latitude and longitude coordinates.',
      params: {
        defaults: {
          mapType: 'Scaled Circle Markers',
          isDesaturated: true,
          addTooltip: true,
          heatMaxZoom: 16,
          heatMinOpacity: 0.1,
          heatRadius: 25,
          heatBlur: 15,
          heatNormalizeData: true,
          wms: config.get('visualization:tileMap:WMSdefaults')
        },
        mapTypes: ['Scaled Circle Markers', 'Shaded Circle Markers', 'Shaded Geohash Grid', 'Heatmap'],
        canDesaturate: !!supports.cssFilters,
        editor: require('plugins/kbn_vislib_vis_types/editors/tile_map.html')
      },
      listeners: {
        rectangle: function (event) {
          const agg = _.get(event, 'chart.geohashGridAgg');
          if (!agg) return;

          const pushFilter = Private(require('ui/filter_bar/push_filter'))(getAppState());
          const indexPatternName = agg.vis.indexPattern.id;
          const field = agg.fieldName();
          const filter = {geo_bounding_box: {}};
          filter.geo_bounding_box[field] = event.bounds;

          pushFilter(filter, false, indexPatternName);
        },
        mapMoveEnd: function (event) {
          const agg = _.get(event, 'chart.geohashGridAgg');
          if (!agg) return;

          agg.params.mapZoom = event.zoom;
          agg.params.mapCenter = [event.center.lat, event.center.lng];

          const editableVis = agg.vis.getEditableVis();
          if (!editableVis) return;

          const editableAgg = editableVis.aggs.byId[agg.id];
          if (editableAgg) {
            editableAgg.params.mapZoom = event.zoom;
            editableAgg.params.mapCenter = [event.center.lat, event.center.lng];
          }
        },
        mapZoomEnd: function (event) {
          const agg = _.get(event, 'chart.geohashGridAgg');
          if (!agg || !agg.params.autoPrecision) return;

          // zoomPrecision maps event.zoom to a geohash precision value
          // event.limit is the configurable max geohash precision
          // default max precision is 7, configurable up to 12
          const zoomPrecision = {
            1: 2,
            2: 2,
            3: 2,
            4: 3,
            5: 3,
            6: 4,
            7: 4,
            8: 5,
            9: 5,
            10: 6,
            11: 6,
            12: 7,
            13: 7,
            14: 8,
            15: 9,
            16: 10,
            17: 11,
            18: 12
          };

          const precision = config.get('visualization:tileMap:maxPrecision');
          agg.params.precision = Math.min(zoomPrecision[event.zoom], precision);

          courier.fetch();
        }
      },
      responseConverter: geoJsonConverter,
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Value',
          min: 1,
          max: 1,
          aggFilter: ['count', 'avg', 'sum', 'min', 'max', 'cardinality'],
          defaults: [
            { schema: 'metric', type: 'count' }
          ]
        },
        {
          group: 'buckets',
          name: 'segment',
          title: 'Geo Coordinates',
          aggFilter: 'geohash_grid',
          min: 1,
          max: 1
        },
        {
          group: 'buckets',
          name: 'split',
          title: 'Split Chart',
          min: 0,
          max: 1
        }
      ])
    });
  };
});
