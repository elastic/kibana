import React from 'react';
import _ from 'lodash';
import Element from 'plugins/rework/elements/element';
import elements from 'plugins/rework/elements/elements';
import stylesheet from '!!raw!./timelion.less';
import Warning from 'plugins/rework/components/warning/warning';

import observeResize from 'plugins/timelion/lib/observe_resize';


import moment from 'moment';
import icon from './icon.svg';
import Arg from 'plugins/rework/arg_types/arg';

import 'plugins/rework/lib/flot';
import $ from 'jquery';


elements.push(new Element('timelion', {
  displayName: 'Timelion Expression Chart',
  icon: icon,
  stylesheet: stylesheet,
  args: [
    new Arg('dataframe', {
      type: 'dataframe',
      help: `This element requires a timelion data source. Timelion expressions can be used to express charts that
      would otherwise require a long, complex, form.`,
      options: {
        types: ['timelion']
      }
    }),
    new Arg('axis_style', {
      type: 'text_style'
    })
  ],
  template: class Timelion extends React.PureComponent {

    constructor(props) {
      super(props);
      this.state = {flotData: []};
    }

    plot() {
      const {args} = this.props;
      const dataSeries = _.groupBy(args.dataframe.value.rows, 'label');

      const flotConfig = {
        xaxis: {
          mode: 'time',
          tickLength: 5,
          timezone: 'browser',
        },
        selection: {
          mode: 'x',
          color: '#ccc'
        },
        crosshair: {
          mode: 'x',
          color: '#C66',
          lineWidth: 2
        },
        grid: {
          //show: render.grid,
          borderWidth: 0,
          borderColor: null,
          margin: 10,
          hoverable: true,
          autoHighlight: false
        },
        legend: {
          backgroundColor: null,
          position: 'nw',
          labelBoxBorderColor: 'rgb(255,255,255,0)',
          labelFormatter: function (label, series) {
            return '<span class="ngLegendValue" ng-click="toggleSeries(' + series._id + ')">' +
              label +
              '<span class="ngLegendValueNumber"></span></span>';
          }
        },
        colors: ['#01A4A4', '#C66', '#D0D102', '#616161', '#00A1CB', '#32742C', '#F18D05', '#113F8C', '#61AE24', '#D70060']
      };


      const flotData = _.map(args.dataframe.meta, (series, i) => {
        series = _.cloneDeep(_.defaults(series, {
          shadowSize: 0,
          lines: {
            lineWidth: 3
          }
        }));

        series.data = _.map(dataSeries[series.label], (row) => {
          return [moment(row.time).valueOf(), row.value];
        });



        series._id = i;

        if (series._hide) {
          series.data = [];
          series.stack = false;
          //series.color = "#ddd";
          series.label = '(hidden) ' + series.label;
        }


        if (series._global) {
          _.merge(flotConfig, series._global, function (objVal, srcVal) {
            // This is kind of gross, it means that you can't replace a global value with a null
            // best you can do is an empty string. Deal with it.
            if (objVal == null) return srcVal;
            if (srcVal == null) return objVal;
          });
        }


        return series;
      });

      try {
        $.plot(this.refs.target, flotData, flotConfig);
      } catch (e) {
        // ....
      }
    }

    componentDidMount(nextProps) {
      this.plot();
      this.cancelResize = observeResize($(this.refs.target), this.plot.bind(this), 100);
    }

    componentDidUpdate(nextProps) {
      this.plot();
    }

    componentWillUnmount() {
      this.cancelResize();
    }

    render() {
      return (
        <div ref="target" className="rework--timelion"></div>
      );
    };
  }
}));
