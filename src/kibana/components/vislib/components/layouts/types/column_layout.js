define(function (require) {
  return function ColumnLayoutFactory(d3, Private) {

    var chartSplit = Private(require('components/vislib/components/layouts/splits/column_chart/chart_split'));
    var yAxisSplit = Private(require('components/vislib/components/layouts/splits/column_chart/y_axis_split'));
    var xAxisSplit = Private(require('components/vislib/components/layouts/splits/column_chart/x_axis_split'));
    var chartTitleSplit = Private(require('components/vislib/components/layouts/splits/column_chart/chart_title_split'));

    /*
     * Specifies the visualization layout for column charts.
     *
     * This is done using an array of objects. Each object has
     * a `parent` DOM element, a DOM `type` (e.g. div, svg, etc),
     * and a `class`. These are required attributes.
     *
     * Optionally, you can specify `datum` to be bound to the DOM
     * element, a `splits` function that divides the selected element
     * into more DOM elements based on a callback function provided, or
     * a children array which nests other layout objects.
     *
     * Objects in children arrays are children of the current object and return
     * DOM elements which are children of their respective parent element.
     */
    return function (el, data) {
      if (!el || !data) {
        throw new Error('Both an el and data need to be specified');
      }

      return [
        {
          parent: el,
          type: 'div',
          class: 'vis-wrapper',
          datum: data,
          children: [
            {
              parent: 'vis-wrapper',
              type: 'div',
              class: 'y-axis-col-wrapper',
              children: [
                {
                  parent: 'y-axis-col-wrapper',
                  type: 'div',
                  class: 'y-axis-col',
                  children: [
                    {
                      parent: 'y-axis-col',
                      type: 'div',
                      class: 'y-axis-title'
                    },
                    {
                      parent: 'y-axis-col',
                      type: 'div',
                      class: 'y-axis-chart-title',
                      splits: chartTitleSplit
                    },
                    {
                      parent: 'y-axis-col',
                      type: 'div',
                      class: 'y-axis-div-wrapper',
                      splits: yAxisSplit
                    }
                  ]
                },
                {
                  parent: 'y-axis-col-wrapper',
                  type: 'div',
                  class: 'y-axis-spacer-block'
                }
              ]
            },
            {
              parent: 'vis-wrapper',
              type: 'div',
              class: 'vis-col-wrapper',
              children: [
                {
                  parent: 'vis-col-wrapper',
                  type: 'div',
                  class: 'chart-wrapper',
                  splits: chartSplit
                },
                {
                  parent: 'vis-col-wrapper',
                  type: 'div',
                  class: 'x-axis-wrapper',
                  children: [
                    {
                      parent: 'x-axis-wrapper',
                      type: 'div',
                      class: 'x-axis-div-wrapper',
                      splits: xAxisSplit
                    },
                    {
                      parent: 'x-axis-wrapper',
                      type: 'div',
                      class: 'x-axis-chart-title',
                      splits: chartTitleSplit
                    },
                    {
                      parent: 'x-axis-wrapper',
                      type: 'div',
                      class: 'x-axis-title'
                    }
                  ]
                }
              ]
            },
            {
              parent: 'vis-wrapper',
              type: 'div',
              class: 'legend-col-wrapper'
            },
            {
              parent: 'vis-wrapper',
              type: 'div',
              class: 'k4tip'
            }
          ]
        }
      ];
    };
  };
});