import React from 'react';
import Element from 'plugins/rework/elements/element';
import elements from 'plugins/rework/elements/elements';

import _ from 'lodash';

elements.push(new Element('json', {
  displayName: 'JSON',
  template: ({args}) => {
    return (
      <pre>
        {JSON.stringify(args, null, ' ')}
      </pre>
    );
  }
}));
