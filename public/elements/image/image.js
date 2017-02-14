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
      type: 'image'
    }),
    new Arg('mode', {
      type: 'select',
      default: 'contain',
      options: {
        choices: ['contain', 'cover']
      }
    })
  ],
  template: class Image extends React.PureComponent {
    constructor(props) {
      super(props);
    }

    render() {
      const style = {
        height: '100%',
        width: '100%',
      };
      return (
        <div style={{
          height: '100%',
          backgroundImage: `url(${this.props.args.image})`,
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: this.props.args.mode
        }}/>
      );
    }

  }
}));
