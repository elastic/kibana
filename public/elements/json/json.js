import React from 'react';
import Element from 'plugins/rework/elements/element';
import elements from 'plugins/rework/elements/elements';
import Arg from 'plugins/rework/arg_types/arg';

import _ from 'lodash';

elements.push(new Element('json', {
  displayName: 'JSON',
  args: [
    new Arg('_style', {
      type: 'style',
      default: ''
    })
  ],
  template: ({args}) => {
    return (
      <div style={args._style}>
        <pre>
          {JSON.stringify(args, null, ' ')}
        </pre>
      </div>
    );
  }
}));
