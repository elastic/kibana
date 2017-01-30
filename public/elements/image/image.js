import React from 'react';
import Element from 'plugins/rework/elements/element';
import elements from 'plugins/rework/elements/elements';
import Arg from 'plugins/rework/arg_types/arg';
import icon from './icon.svg';

elements.push(new Element('image', {
  displayName: 'Image',
  icon: icon,
  args: [
    new Arg('image', {
      type: 'image',
      default: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiA' +
    'xNiI+PHBhdGggZD0iTTggMkE0IDQgMCAwIDAgNCA2SDVBMyAzIDAgMCAxIDggMyAzIDMgMCAwIDEgMTEgNiAzIDMgMCAwIDEgOCA5SDdWMTJI' +
    'OFYxMEE0IDQgMCAwIDAgMTIgNiA0IDQgMCAwIDAgOCAyTTcgMTNWMTRIOFYxM0g3IiBmaWxsPSIjNGQ0ZDRkIi8+PC9zdmc+'
    }),
    new Arg('mode', {
      type: 'select',
      default: 'contain',
      options: {
        choices: ['contain', 'cover']
      }
    })
  ],
  template: ({args}) => {
    const style = {
      height: '100%',
      width: '100%',
    };
    return (
      <div style={{
        height: '100%',
        backgroundImage: `url(${args.image})`,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: args.mode
      }}/>
    );
  }
}));
