import React from 'react';
import Element from 'plugins/rework/elements/element';
import elements from 'plugins/rework/elements/elements';

import _ from 'lodash';

elements.push(new Element('box', {
  displayName: 'Box',
  template: ({args}) => {
    const style = {
      height: '100%',
      width: '100%',
      backgroundColor: args.color
    };
    return (
      <div style={style}></div>
    );
  }
}));
