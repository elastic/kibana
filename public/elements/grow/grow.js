import React from 'react';
import _ from 'lodash';
import Element from 'plugins/rework/elements/element';
import elements from 'plugins/rework/elements/elements';
import Dataframe from 'plugins/rework/arg_types/dataframe/lib/dataframe';
import stylesheet from '!!raw!./grow.less';
import Warning from 'plugins/rework/components/warning/warning';
import GridBlocks from 'plugins/rework/components/grid_blocks/grid_blocks';

import moment from 'moment';
import icon from './icon.svg';
import Arg from 'plugins/rework/arg_types/arg';

elements.push(new Element('grow', {
  displayName: 'Time Chart',
  icon: icon,
  stylesheet: stylesheet,
  args: [
    new Arg('dataframe', {
      type: 'dataframe',
      default: (state) => _.keys(state.transient.dataframeCache)[0]
    }),
    new Arg('image', {
      type: 'image',
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
  template: class Grow extends React.PureComponent {

    componentWillUpdate(nextProps) {
      const {args, setArg} = nextProps;

      if (args.dataframe.schema === 'timeseries' || args.dataframe.schema === 'timelion') {
        setArg('time_column', 'time');
        setArg('value_column', 'value');
        setArg('group_by', 'label');
      };
    }

    render() {
      const {args, setArg} = this.props;

      const valueObj = args.dataframe.aggregate.by(args.group_by)[args.aggregate_with](args.value_column);
      const max = _.max(_.values(valueObj));
      return (
        <div style={{width: '100%', height: '100%'}} className="rework--grow">
          <GridBlocks>
            {_.map(valueObj, (value, key) => {
              const scale = value / max;
              return (
                <div className="rework--grow-wrapper" key={key}>
                  <div
                    style={{
                      display: 'inline-block',
                      height: '100%',
                      width: '100%',
                      backgroundImage: `url(${args.image})`,
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: 'contain',
                      transform: `scale(${scale})`
                    }}>
                  </div>
                  <div className="rework--grow-label" style={{
                    height: _.get(args.label_style, 'object.fontSize') + 'px'
                  }}>
                    <center>{key}</center>
                  </div>
              </div>
              );
            })}
          </GridBlocks>
        </div>
      );

    };
  }
}));
