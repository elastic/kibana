import React from 'react';
import _ from 'lodash';
import Element from 'plugins/rework/elements/element';
import elements from 'plugins/rework/elements/elements';
import Dataframe from 'plugins/rework/arg_types/dataframe/lib/dataframe';
import icon from './icon.svg';
import FontResize from 'plugins/rework/components/font_resize/font_resize';

import Arg from 'plugins/rework/arg_types/arg';

elements.push(new Element('number', {
  displayName: 'Number',
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
    new Arg('group_by', {
      type: 'dataframe_column',
    }),

  ],
  template: ({args}) => {
    if (!_.get(args.dataframe, 'aggregate')) return (<div></div>);

    let content;
    if (!args.group_by.length) {
      content = args.dataframe.aggregate[args.aggregate_with](args.column);
    } else {
      content = _.map(args.dataframe.aggregate.by(args.group_by)[args.aggregate_with](args.column), (val, key) => {
        return (
          <div key={key}>
            {val}<br/>
            <small>{key}</small>
          </div>
        );
      });
    }

    return (
      <FontResize>
        <div style={{display: 'inline-block'}}>
          {content}
        </div>
      </FontResize>
    );
  }
}));
