import React from 'react';
import _ from 'lodash';
import Element from 'plugins/rework/elements/element';
import elements from 'plugins/rework/elements/elements';
import Dataframe from 'plugins/rework/arg_types/dataframe/lib/dataframe';
import stylesheet from '!!raw!./circle.less';
import Warning from 'plugins/rework/components/warning/warning';
import GridBlocks from 'plugins/rework/components/grid_blocks/grid_blocks';

import moment from 'moment';
import icon from './icon.svg';
import './flot';
import $ from 'jquery';
import Arg from 'plugins/rework/arg_types/arg';

elements.push(new Element('circle', {
  displayName: 'Circle',
  icon: icon,
  stylesheet: stylesheet,
  args: [
    new Arg('dataframe', {
      type: 'dataframe',
      default: (state) => _.keys(state.transient.dataframeCache)[0]
    }),
    new Arg('value_column', {
      type: 'dataframe_column',
      default: 'value'
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
      default: 'label'
    }),
    new Arg('label_style', {
      type: 'text_style',
    }),
  ],
  template: class Circles extends React.PureComponent {

    shouldComponentUpdate(nextProps) {
      let result = false;
      const height = $(this.refs.plot).height();
      const width = $(this.refs.plot).width();

      if (height !== this.height
        || width !== this.width
        || nextProps.args !== this.props.args) result = true;

      this.height = height;
      this.width = width;

      return result;
    }

    componentWillUpdate(nextProps) {
      const {args, setArg} = nextProps;

      if (args.dataframe.schema === 'timeseries' || args.dataframe.schema === 'timelion') {
        setArg('time_column', 'time');
        setArg('value_column', 'value');
        setArg('group_by', 'label');
      };
    }

    componentDidUpdate() {
      const flotConfig = {
        series: {
          pie: {
            show: true,
            //startAngle: (args.start_angle || 0) * (Math.PI / 180),
            label: {
              show: true,
              //formatter: labelFormatter
            }
          }
        },
        grid: {
          show: false,
          margin: 10
        },
        legend: {
          show: false
        },
      };

      const {args, setArg} = this.props;

      const valueObj = args.dataframe.aggregate.by(args.group_by)[args.aggregate_with](args.value_column);
      const max = _.max(_.values(valueObj));

      var flotSeries = _.map(valueObj, (value, label) => {
        return {
          label: label,
          data: value,
          //color: series.color
        };
      });

      $.plot($(this.refs.plot), flotSeries, flotConfig);
    }

    render() {
      const {args, setArg} = this.props;

      const valueObj = args.dataframe.aggregate.by(args.group_by)[args.aggregate_with](args.value_column);
      const max = _.max(_.values(valueObj));
      return (
        <div style={{width: '100%', height: '100%'}} ref="plot" className="rework--circle"></div>
      );

    };
  }
}));
