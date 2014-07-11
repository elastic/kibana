define(function (require) {
  var module = require('modules').get('apps/visualize');
  var _ = require('lodash');

  var typeDefs = [
    {
      name: 'histogram',
      icon: 'icon-chart-bar',
      params: {
        shareYAxis: true,
        addTooltip: true,
        addLegend: true
      },
      listeners: {
        onClick: function (e) {
          // TODO: We need to be able to get ahold of angular services here
          console.log(e);
        }
      },
      config: {
        metric: {
          label: 'Y-Axis',
          min: 1,
          max: 1
        },
        segment: {
          label: 'X-Axis',
          min: 1,
          max: 1
        },
        group: {
          label: 'Color',
          min: 0,
          max: 1
        },
        split: {
          label: 'Rows & Columns',
          min: 0,
          max: 1
        }
      }
    },
    {
      name: 'line',
      icon: 'icon-chart-bar',
      params: {
        shareYAxis: true,
        addTooltip: true,
        addLegend: true
      },
      listeners: {
      },
      config: {
        metric: {
          label: 'Y-Axis',
          min: 1,
          max: 1
        },
        segment: {
//          limitToOrderedAggs: true,
          label: 'X-Axis',
          min: 1,
          max: 1
        },
        group: {
          label: 'Color',
          min: 0,
          max: 1
        },
        split: {
          label: 'Rows & Columns',
          min: 0,
          max: 1
        }
      }
    },
    {
      name: 'area',
      icon: 'icon-chart-bar',
      params: {
        shareYAxis: true,
        addTooltip: true,
        addLegend: true,
        isStacked: true
      },
      listeners: {
        onClick: function (e) {
          // TODO: We need to be able to get ahold of angular services here
          console.log(e);
        }
      },
      config: {
        metric: {
          label: 'Y-Axis',
          min: 1,
          max: 1
        },
        segment: {
//          limitToOrderedAggs: true,
          label: 'X-Axis',
          min: 1,
          max: 1
        },
        group: {
          label: 'Color',
          min: 0,
          max: 1
        },
        split: {
          label: 'Rows & Columns',
          min: 0,
          max: 1
        }
      }
    },
    {
      name: 'pie',
      icon: 'icon-chart-bar',
      params: {
        addTooltip: true,
        addLegend: true
      },
      listeners: {
      },
      config: {
        metric: {
          label: 'Y-Axis',
          min: 1,
          max: 1
        },
        segment: {
          label: 'X-Axis',
          min: 1,
          max: 1
        },
        group: {
          label: 'Color',
          min: 0,
          max: 1
        },
        split: {
          label: 'Rows & Columns',
          min: 0,
          max: 1
        }
      }
    }
  ];

  typeDefs.byName = _.indexBy(typeDefs, 'name');

  return typeDefs;
});