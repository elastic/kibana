define(function (require) {
  return function TileMapFactory(Private) {
    var _ = require('lodash');
    var $ = require('jquery');
    var L = require('leaflet');

    // mapquest api key and require
    //console.log('Mapquest API key', config.get('mapquest:apiKey'));
    //var url  = 'http://www.mapquestapi.com/sdk/leaflet/v1.s/mq-map.js?key=' + config.get('mapquest:apiKey');
    //var MQ = require([url], function () {
    //  console.log('mapquest loaded');
    //});

    var Chart = Private(require('components/vislib/visualizations/_chart'));
    var errors = require('errors');

    // Dynamically adds css file
    require('css!components/vislib/styles/main');

    /*
     * Tile map visualization => vertical maps, stacked maps
     */
    _(TileMap).inherits(Chart);
    function TileMap(handler, chartEl, chartData) {
      if (!(this instanceof TileMap)) {
        return new TileMap(handler, chartEl, chartData);
      }

      var raw;
      var fieldIndex;

      if (handler.data.data.raw) {
        raw = handler.data.data.raw.columns;
        fieldIndex = _.findIndex(raw, {'categoryName': 'group'});
      }

      this.fieldFormatter = raw && raw[fieldIndex] ? raw[fieldIndex].field.format.convert : function (d) { return d; };

      TileMap.Super.apply(this, arguments);
      // Tile map specific attributes
      this._attr = _.defaults(handler._attr || {}, {
        xValue: function (d, i) { return d.x; },
        yValue: function (d, i) { return d.y; }
      });
    }

    TileMap.prototype.addMap = function (div, layers) {
      var self = this;
      var data = this.chartData;
      var color = this.handler.data.getColorFunc();
      var xScale = this.handler.xAxis.xScale;
      var yScale = this.handler.yAxis.yScale;
      var tooltip = this.tooltip;
      var isTooltip = this._attr.addTooltip;
      var layer;
      var maps;

      console.log('map data', data);

      // add maps here


      // add tooltip
      if (isTooltip) {
        maps.call(tooltip.render());
      }

      return maps;
    };

    TileMap.prototype.addMapEvents = function (div, maps, brush) {
      var events = this.events;
      var dispatch = this.events._attr.dispatch;
      var xScale = this.handler.xAxis.xScale;
      var startXInv;

      maps
      .on('mouseover.bar', function (d, i) {
        // dispatch.hover(events.eventResponse(d, i));
      })
      .on('mousedown.bar', function () {
        //
      })
      .on('click.bar', function (d, i) {
        // dispatch.click(events.eventResponse(d, i));
      })
      .on('mouseout.bar', function () {
        //
      });
    };

    TileMap.prototype.draw = function () {
      // Attributes
      var self = this;
      var xScale = this.handler.xAxis.xScale;
      var $elem = $(this.chartEl);
      var margin = this._attr.margin;
      var elWidth = this._attr.width = $elem.width();
      var elHeight = this._attr.height = $elem.height();
      var minWidth = 20;
      var minHeight = 20;
      var isEvents = this._attr.addEvents;
      var div;
      var width;
      var height;
      var layers;
      var brush;
      var maps;

      return function (selection) {

        console.log('map draw', selection);

        selection.each(function (data) {
          // Stack data
          layers = self.stackData(data);

          // Get the width and height
          width = elWidth;
          height = elHeight - margin.top - margin.bottom;

          if (width < minWidth || height < minHeight) {
            throw new errors.ContainerTooSmall();
          }

          // Select the current DOM element
          div = $(this);

          // Create the canvas for the visualization
          div.append('div')
          .attr('width', width)
          .attr('height', height + margin.top + margin.bottom);

          // add maps
          maps = self.addMaps(div, layers);

          // add events to maps
          if (isEvents) {
            self.addMapEvents(div, maps, brush);
          }

          return div;
        });
      };
    };

    return TileMap;
  };
});
