import React from 'react';
import _ from 'lodash';
import Element from 'plugins/rework/elements/element';
import elements from 'plugins/rework/elements/elements';
import Dataframe from 'plugins/rework/arg_types/dataframe/lib/dataframe';
import stylesheet from '!!raw!./chart.less';
import Warning from 'plugins/rework/components/warning/warning';
import GridBlocks from 'plugins/rework/components/grid_blocks/grid_blocks';

import moment from 'moment';
import icon from './icon.svg';
import 'plugins/rework/lib/flot';
import $ from 'jquery';
import Arg from 'plugins/rework/arg_types/arg';

elements.push(new Element('chart', {
  displayName: 'Chart',
  icon: icon,
  stylesheet: stylesheet,
  args: [
    new Arg('dataframe', {
      type: 'dataframe',
    }),
    new Arg('value_column', {
      type: 'dataframe_column',
    }),
    new Arg('aggregate_with', {
      type: 'select',
      help: 'Function to use for aggregating values when the column contains more than a single value',
      default: 'last',
      options: {
        choices: ['sum', 'min', 'max', 'avg', 'last']
      }
    }),
    new Arg('group_by', {
      type: 'dataframe_column',
    }),
    new Arg('label_style', {
      type: 'text_style',
    }),
    new Arg('value_style', {
      type: 'text_style',
    }),
    new Arg('theme', {
      type: 'palette',
    }),
  ],
  template: class Chart extends React.PureComponent {

    shouldComponentUpdate(nextProps) {
      let result = false;
      const height = $(this.refs.plot).height();
      const width = $(this.refs.plot).width();

      // Update if the height/width have changed, or the arguments have changed.
      if (height !== this.height
        || width !== this.width
        || nextProps.args !== this.props.args) result = true;

      this.height = height;
      this.width = width;

      return result;
    }

    renderChart() {
      const {args, setArg} = this.props;

      let valueObj;
      if (args.group_by) {
        valueObj = args.dataframe.aggregate.by(args.group_by)[args.aggregate_with](args.value_column);
      } else {
        valueObj = args.dataframe.aggregate[args.aggregate_with](args.value_column);
      };

      const data = [];
      const ticks = [];
      _.each(_.toPairs(valueObj), (pair, i) => {
        data.push([i, pair[1]]);
        ticks.push([i, pair[0]]);
      });

      const flotConfig = {
        series: {
          bars: {
            show: true,
            barWidth: 0.6,
            align: 'center',
            fill: 1
          },
        },
        xaxis: {},
        yaxis: {
          autoscaleMargin: 0.2,
          ticks: [],
          tickLength: 0
        },
        legend: {
          show: false
        },
        grid: {
          color: 'rgba(0,0,0,0)'
        },
        colors: this.props.args.theme
      };

      flotConfig.xaxis.ticks = ticks;

      try {
        const plot = $.plot($(this.refs.plot), [data], flotConfig);

        var barWidthPixels =  plot.getOptions().series.bars.barWidth * plot.getXAxes()[0].scale;
        _.each(plot.getData()[0].data, (point, i) => {
          var o = plot.pointOffset({x: point[0], y: point[1]});
          $('<div class="rework--chart-value">' + point[1] + '</div>').css({
            position: 'absolute',
            width: barWidthPixels,
            height: args.value_style.object.fontSize,
            left: o.left - (barWidthPixels / 2),
            top: o.top - 10 - args.value_style.object.fontSize,
          }).appendTo(plot.getPlaceholder());
        });
      } catch (e) {
        console.log('Plot too small');
      }
    }

    setColumns() {
      const {args, setArg} = this.props;
      const setUndefined = (prop, value) => {
        if (!_.get(args[prop], 'length')) {
          setArg(prop, value);
        }
      };

      if (args.dataframe.schema === 'timeseries' || args.dataframe.schema === 'timelion') {
        setUndefined('value_column', 'value');
        setUndefined('group_by', 'label');
      } else {
        setUndefined('value_column', _.get(args.dataframe.columns.ofType('number')[0], 'name'));
        setUndefined('group_by', _.get(args.dataframe.columns.ofType('string')[0], 'name'));
      }
    }

    componentWillMount() {
      this.setColumns();
    }

    componentDidMount() {
      this.renderChart();
    }

    componentDidUpdate() {
      this.renderChart();
    }

    render() {
      return (
        <div style={{width: '100%', height: '100%'}} ref="plot" className="rework--chart"></div>
      );

    };
  }
}));
