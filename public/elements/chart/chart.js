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

import {pie} from './chart_types/pie';
import {verticalBar} from './chart_types/vertical_bar';

elements.push(new Element('chart', {
  displayName: 'Chart',
  icon: icon,
  stylesheet: stylesheet,
  args: [
    new Arg('chart_type', {
      type: 'select',
      help: '',
      default: 'vertical_bar',
      options: {
        choices: ['vertical_bar', 'horizontal_bar', 'pie']
      }
    }),
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
      const {args} = this.props;

      try {
        switch (args.chart_type) {
          case 'pie':
            pie(this.refs.plot, args);
            break;
          case 'vertical_bar':
            verticalBar(this.refs.plot, args);
            break;
          default:
            $(this.refs.plot).text('No such chart type');
        }
      } catch (e) {
        $(this.refs.plot).text('Failed to render chart');
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
