import React from 'react';
import Element from 'plugins/rework/elements/element';
import elements from 'plugins/rework/elements/elements';
import Arg from 'plugins/rework/arg_types/arg';
import icon from './icon.svg';

elements.push(new Element('box', {
  displayName: 'Box',
  icon: icon,
  args: [],
  template: ({args}) => {
    const style = {
      height: '100%',
      width: '100%',
    };
    return (
      <div style={style}></div>
    );
  }
}));
