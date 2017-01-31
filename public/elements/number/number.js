import React from 'react';
import _ from 'lodash';
import Element from 'plugins/rework/elements/element';
import elements from 'plugins/rework/elements/elements';
import Dataframe from 'plugins/rework/arg_types/dataframe/lib/dataframe';
import icon from './icon.svg';
import FontResize from 'plugins/rework/components/font_resize/font_resize';
import GridBlocks from 'plugins/rework/components/grid_blocks/grid_blocks';
import stylesheet from '!!raw!./number.less';


import Arg from 'plugins/rework/arg_types/arg';

elements.push(new Element('number', {
  displayName: 'Number',
  stylesheet: stylesheet,
  icon: icon,
  args: [
    new Arg('dataframe', {
      type: 'dataframe',
      default: (state) => _.keys(state.transient.dataframeCache)[0]
    }),
    new Arg('column', {
      type: 'dataframe_column',
      help: 'Column of which to show the value',
      default: 'value'
    }),
    new Arg('aggregate_with', {
      type: 'select',
      help: 'Function to use for aggregating values when the column has more than a single value',
      default: 'last',
      options: {
        choices: ['sum', 'min', 'max', 'avg', 'last']
      }
    }),
    new Arg('label_by', {
      type: 'dataframe_column',
    }),
    new Arg('value_style', {
      type: 'text_style',
    }),
    new Arg('label_style', {
      type: 'text_style',
    }),
    new Arg('layout', {
      type: 'select',
      default: 'row',
      options: {
        choices: ['row', 'column']
      }
    }),
  ],
  template: ({args}) => {
    if (!_.get(args.dataframe, `aggregate.${args.aggregate_with}`)) return (<div></div>);

    let content;
    if (!_.get(args, 'label_by.length')) {
      content = (
        <div className="rework--number-value">
          {args.dataframe.aggregate[args.aggregate_with](args.column)}
        </div>
      );
    } else {
      content = (
        <div style={{display: 'flex', flexDirection: args.layout, flexRow: 1, flexBasis: 0}}>
          {_.map(args.dataframe.aggregate.by(args.label_by)[args.aggregate_with](args.column), (val, key) => (
            <div style={{width: '100%', height: '100%'}} key={key}>
              <div className="rework--number-value">{val}</div>
              <div className="rework--number-label">{key}</div>
            </div>
          ))}
        </div>
      );
    }

    return (<div style={{height: '100%', width: '100%'}}>{content}</div>);
  }
}));
