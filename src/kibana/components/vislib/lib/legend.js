define(function (require) {
  return function LegendFactory(d3, Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    // Dynamically adds css file
    require('css!components/vislib/components/styles/main');

    function Legend(labels, color, config, el) {
      this.el = el;
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
    }

    Legend.prototype.header = function (el) {
      return el.append('div')
        .attr('class', 'header')
        .append('div')
        .attr('class', 'column-labels')
        .html('<span class="btn btn-xs btn-default legend-toggle">' +
          '<i class="fa fa-list-ul"></i></span>');
    };

    Legend.prototype.list = function (el, arrOfItms, args) {
      var self = this;

      return el.append('ul')
        .attr('class', function () {
          if (args._attr.isOpen) {
            return 'legend-ul';
          }
          return 'legend-ul hidden';
        })
        .selectAll('li')
        .data(arrOfItms)
        .enter()
        .append('li')
        .attr('class', function (d) {
          return 'color ' + self.classify(args.color(d));
        })
        .html(function (d) {
          return '<span class="dots" style="background:' + args.color(d) + '"></span>' + d;
        });
    };

    Legend.prototype.classify = function (name) {
      return 'c' + name.replace(/[#]/g, '');
    };

    Legend.prototype.render = function () {
      var visEl = d3.select(this.el);
      var legendDiv = visEl.select('.' + this._attr.legendClass);
      var items = this.labels;
      var header = this.header(legendDiv);
      var headerIcon = visEl.select('.legend-toggle');
      var list = this.list(legendDiv, items, this);

      var self = this;

      // toggle
      headerIcon.on('click', function (d) {
        if (self._attr.isOpen) {
          // close legend
          visEl.select('ul.legend-ul')
            .classed('hidden', true);
          self._attr.isOpen = false;
          
        } else {
          // open legend
          visEl.select('ul.legend-ul')
            .classed('hidden', false);
          self._attr.isOpen = true;
        }
      });

      visEl.selectAll('.color')
        .on('mouseover', function (d) {
          var liClass = '.' + self.classify(self.color(d));
          visEl.selectAll('.color').style('opacity', self._attr.blurredOpacity);
          
          // select series on chart
          visEl.selectAll(liClass).style('opacity', self._attr.focusOpacity);

          visEl.selectAll('.color')
            .style('opacity', self._attr.blurredOpacity);
          
          // Select series on chart
          visEl.selectAll(liClass)
            .style('opacity', self._attr.focusOpacity);
        });

      visEl.selectAll('.color')
        .on('mouseout', function () {
          visEl.selectAll('.color').style('opacity', self._attr.defaultOpacity);
        });
    };

    return Legend;
  };
});