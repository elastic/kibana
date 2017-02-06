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
import 'plugins/rework/lib/flot';
import $ from 'jquery';
import Arg from 'plugins/rework/arg_types/arg';

elements.push(new Element('circle', {
  displayName: 'Circle',
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
    new Arg('stroke', {
      help: '',
      type: 'container_style',
      options: {
        show: {
          borderWidth: true,
          borderColor: true
        }
      }
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

    renderChart() {
      const strokeParts = this.props.args.stroke.border.match(/([0-9]+)px [a-z]+ (.*)/);
      const strokeWidth = strokeParts[1];
      const strokeColor = strokeParts[2];
      const flotConfig = {
        series: {
          pie: {
            show: true,
            stroke: {
              width: strokeWidth,
              color: strokeColor,
            },
            //startAngle: (args.start_angle || 0) * (Math.PI / 180),
            label: {
              show: true,
              formatter: (label, slice) => `
                <div>
                  <div class="rework--circle-label">
                    <span class="rework--circle-label-text">${label}</span>
                    <i class="fa fa-circle rework--circle-label-color" style="color: ${slice.color}"></i>
                  </div>
                  <div class="rework--circle-value">${slice.data[0][1]}</div>
                </div>
              `
            }
          }
        },
        grid: {
          show: false,
        },
        legend: {
          show: false
        },
        colors: this.props.args.theme
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

      try {
        $.plot($(this.refs.plot), flotSeries, flotConfig);
      } catch (e) {
        console.log('Plot too small');
      }
    }

    componentDidMount() {
      const {args, setArg} = this.props;
      const setUndefined = (prop, value) => {
        if (!args[prop].length) {
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

      this.renderChart();
    }

    componentDidUpdate() {
      this.renderChart();
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
