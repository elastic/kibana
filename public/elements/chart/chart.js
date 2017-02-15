import React from 'react';
import _ from 'lodash';
import Element from 'plugins/rework/elements/element';
import elements from 'plugins/rework/elements/elements';
import Dataframe from 'plugins/rework/arg_types/dataframe/lib/dataframe';
import stylesheet from '!!raw!./chart.less';
import Warning from 'plugins/rework/components/warning/warning';
import observeResize from 'plugins/timelion/lib/observe_resize';


import moment from 'moment';
import icon from './icon.svg';
import 'plugins/rework/lib/flot';
import $ from 'jquery';
import Arg from 'plugins/rework/arg_types/arg';

import {pie} from './chart_types/pie';
import pieIcon from './chart_types/pie.svg';

import {verticalBar} from './chart_types/vertical_bar';
import verticalBarIcon from './chart_types/vertical_bar.svg';

import {horizontalBar} from './chart_types/horizontal_bar';
import horizontalBarIcon from './chart_types/horizontal_bar.svg';


elements.push(new Element('chart', {
  displayName: 'Chart',
  icon: icon,
  stylesheet: stylesheet,
  args: [
    new Arg('chart_type', {
      type: 'icon_select',
      help: '',
      default: 'vertical_bar',
      options: {
        choices: [
          {
            label: 'Vertical Bar',
            icon: verticalBarIcon,
            value: 'vertical_bar'
          },
          {
            label: 'Horizontal Bar',
            icon: horizontalBarIcon,
            value: 'horizontal_bar'
          },
          {
            label: 'Pie Chart',
            icon: pieIcon,
            value: 'pie'
          }
        ]
      }
    }),
    new Arg('dataframe', {
      type: 'dataframe'
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
      help: 'Only applies to pie charts',
      type: 'container_style',
      options: {
        show: {
          borderWidth: true,
          borderColor: true
        }
      }
    }),
  ],
  template: class Chart extends React.PureComponent {

    shouldComponentUpdate(nextProps) {
      let result = false;
      const height = $(this.plot).height();
      const width = $(this.plot).width();

      // Update if the height/width have changed, or the arguments have changed.
      if (height !== this.height
        || width !== this.width
        || nextProps.args !== this.props.args) result = true;

      this.height = height;
      this.width = width;

      return result;
    }

    renderChart() {
      const {args} = this.props;

      try {
        switch (args.chart_type) {
          case 'pie':
            pie(this.plot, args);
            break;
          case 'vertical_bar':
            verticalBar(this.plot, args);
            break;
          case 'horizontal_bar':
            horizontalBar(this.plot, args);
            break;
          default:
            console.log('No such chart type');
        }
      } catch (e) {
        console.log(e);
      }


      /* Start changes */
      /* end changes */
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
      this.cancelResize = observeResize($(this.plot), this.renderChart.bind(this), 100);
    }

    componentWillUnmount() {
      this.cancelResize();
    }

    componentDidUpdate() {
      this.renderChart();
    }

    render() {
      return (
        <div style={{width: '100%', height: '100%'}} ref={plot => this.plot = plot} className="rework--chart"></div>
      );

    };
  }
}));
