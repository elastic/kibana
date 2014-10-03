define(function (require) {
  return function LegendFactory(d3, Private) {
    var _ = require('lodash');
    var legendHeaderTemplate = _.template(require('text!components/vislib/partials/legend_header.html'));

    var Tooltip = Private(require('components/vislib/lib/tooltip'));

    // Dynamically adds css file
    require('css!components/vislib/styles/main');

    /*
     * Append legend to the visualization
     * arguments:
     *  el => reference to DOM element
     *  labels => array of labels from the chart data
     *  color => color function to assign colors to labels
     *  _attr => visualization attributes
     */
    function Legend(vis, el, labels, color, _attr) {
      if (!(this instanceof Legend)) {
        return new Legend(vis, el, labels, color, _attr);
      }

      this.vis = vis;
      this.el = el;
      this.labels = labels;
      this.color = color;
      this._attr = _.defaults(_attr || {}, {
        // Legend specific attributes
        'legendClass' : 'legend-col-wrapper',
        'blurredOpacity' : 0.3,
        'focusOpacity' : 1,
        'defaultOpacity' : 1,
        'isOpen' : true
      });
    }

    // Add legend header
    Legend.prototype.header = function (el, args) {
      return el.append('div')
        .attr('class', 'header')
        .append('div')
        .attr('class', 'column-labels')
        .html(function () {
          return legendHeaderTemplate(args._attr);
        });
    };

    // Add legend list
    Legend.prototype.list = function (el, arrOfLabels, args) {
      var self = this;

      return el.append('ul')
        .attr('class', function () {
          if (args._attr.isOpen) {
            return 'legend-ul';
          }
          return 'legend-ul hidden';
        })
        .selectAll('li')
        .data(arrOfLabels)
        .enter()
        .append('li')
        .attr('class', function (d) {
          // class names reflect the color assigned to the labels
          return 'color ' + self.colorToClass(args.color(d));
        })
        .html(function (d) {
          // return the appropriate color for each dot
          return '<span class="dots" style="background:' + args.color(d) + '"></span>' + d;
        });
    };

    // Create a class name based on the colors assigned to each label
    Legend.prototype.colorToClass = function (name) {
      return 'c' + name.replace(/[#]/g, '');
    };

    // Render the legend
    Legend.prototype.render = function () {
      var visEl = d3.select(this.el);
      var legendDiv = visEl.select('.' + this._attr.legendClass);
      var items = this.labels;
      var header = this.header(legendDiv, this);
      var headerIcon = visEl.select('.legend-toggle');
      var list = this.list(legendDiv, items, this);

      var self = this;

      // toggle
      headerIcon
      .on('click', function legendClick() {
        if (self._attr.isOpen) {
          // close legend
          visEl.select('ul.legend-ul')
            .classed('hidden', true);
          self._attr.isOpen = false;
          // need to add reference to resize function on toggle
          self.vis.resize();
        } else {
          // open legend
          visEl.select('ul.legend-ul')
            .classed('hidden', false);
          self._attr.isOpen = true;

          // need to add reference to resize function on toggle
          self.vis.resize();
        }
      });

      visEl.selectAll('.color')
        .on('mouseover', function (d) {
          var liClass = '.' + self.colorToClass(self.color(d));
          visEl.selectAll('.color').style('opacity', self._attr.blurredOpacity);
          
          // select series on chart
          visEl.selectAll(liClass).style('opacity', self._attr.focusOpacity);
        })
        .on('mouseout', function () {
          visEl.selectAll('.color').style('opacity', self._attr.defaultOpacity);
        });
    };

    return Legend;
  };
});