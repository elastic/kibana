define(function (require) {
  return function LegendFactory(d3, Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    var createHeader = Private(require('components/vislib/components/Legend/header'));
    var createList = Private(require('components/vislib/components/Legend/list'));
    var classify = Private(require('components/vislib/components/Legend/classify'));

    // Dynamically adds css file
    require('css!components/vislib/components/styles/main');

    function Legend(labels, color, config, el) {
      this.labels = labels;
      this.color = color;
      this._attr = _.defaults(config || {}, {
        'legendClass' : 'legend-col-wrapper',
        'blurredOpacity' : 0.3,
        'focusOpacity' : 1,
        'defaultOpacity' : 1,
        'isOpen' : false,
        'width': 20
      });
      this.el = el;
    }

    Legend.prototype.render = function () {
      var visEl = d3.select(this.el);
      var legendDiv = visEl.select('.' + this._attr.legendClass);
      var items = this.labels;
      var header = createHeader(legendDiv);
      var headerIcon = visEl.select('.legend-toggle');
      var list = createList(legendDiv, items, this);
      //var width = this._attr.width ? this._attr.width : this.getMaxLabelLength(list);

      var that = this;

      // toggle
      headerIcon.on('click', function (d) {
        if (that._attr.isOpen) {
          // close legend
          visEl.select('ul.legend-ul')
            .classed('hidden', true);
          that._attr.isOpen = false;
          
        } else {
          // open legend
          visEl.select('ul.legend-ul')
            .classed('hidden', false);
          that._attr.isOpen = true;
          
        }


      });

      visEl.selectAll('.color')
        .on('mouseover', function (d) {
          var liClass = '.' + classify(that.color(d));
          visEl.selectAll('.color').style('opacity', that._attr.blurredOpacity);
          
          // select series on chart
          visEl.selectAll(liClass).style('opacity', that._attr.focusOpacity);

          visEl.selectAll('.color')
            .style('opacity', that._attr.blurredOpacity);
          
          // Select series on chart
          visEl.selectAll(liClass)
            .style('opacity', that._attr.focusOpacity);
        });

      visEl.selectAll('.color')
        .on('mouseout', function () {
          visEl.selectAll('.color').style('opacity', that._attr.defaultOpacity);
        });

      // add/remove class to open legend
      // if (this._attr.isOpen) {
      //   d3.select('.' + this._attr.legendClass)
      //     .classed('open4', true);
      // } else {
      //   d3.select('.' + this._attr.legendClass)
      //     .classed('open4', false);
      // }

    };

    return Legend;
  };
});