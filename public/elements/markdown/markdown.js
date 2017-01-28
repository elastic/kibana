import React from 'react';
import Element from 'plugins/rework/elements/element';
import elements from 'plugins/rework/elements/elements';
import Arg from 'plugins/rework/arg_types/arg';
import Remarkable from 'remarkable';
import icon from './icon.svg';
import FontResize from './font_resize';
import _ from 'lodash';
import './markdown.less';
import handlebars from 'handlebars/dist/handlebars';
import Dataframe from 'plugins/rework/arg_types/dataframe/lib/dataframe';


const md = new Remarkable('full', {
  html: false, // I'm a crazy person!
  linkify: true,
  typographer: true,
});

elements.push(new Element('markdown', {
  displayName: 'markdown',
  icon: icon,
  args: [
    new Arg('markdown', {
      type: 'string',
      default: 'Your Text Here',
      options: {
        rows: 10
      }
    }),
    new Arg('dataframe', {
      type: 'dataframe',
      default: (state) => _.keys(state.transient.dataframeCache)[0]
    }),
  ],
  template: ({args}) => {
    const style = {
      height: '100%',
      width: '100%',
      backgroundColor: args.color
    };

    function getContent() {
      let markdown;
      try {
        const template = handlebars.compile(args.markdown || '');
        markdown = template({rows: args.dataframe.rows});
      } catch (e) {
        console.log(e);
        markdown = args.markdown;
      }

      return {__html: md.render(markdown)};
    }

    return (
      <FontResize><div className="rework--markdown" dangerouslySetInnerHTML={getContent()}></div></FontResize>
    );
  }
}));
