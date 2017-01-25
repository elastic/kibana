import React from 'react';
import Element from 'plugins/rework/elements/element';
import elements from 'plugins/rework/elements/elements';
import Arg from 'plugins/rework/arg_types/arg';

import _ from 'lodash';

elements.push(new Element('json', {
  args: [],
  template: ({args}) => {
    //const style = Object.assign({}, args._style, {height: '100%', width: '100%'});
    return (
      <pre>
        {JSON.stringify(args, null, ' ')}
      </pre>
    );
  }
}));
