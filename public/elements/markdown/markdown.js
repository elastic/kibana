import React from 'react';
import Element from 'plugins/rework/elements/element';
import elements from 'plugins/rework/elements/elements';
import Arg from 'plugins/rework/arg_types/arg';
import Remarkable from 'remarkable';
import icon from './icon.svg';
import FontResize from 'plugins/rework/components/font_resize/font_resize';
import _ from 'lodash';
import stylesheet from '!!raw!./markdown.less';
import handlebars from 'handlebars/dist/handlebars';
import Dataframe from 'plugins/rework/arg_types/dataframe/lib/dataframe';


const md = new Remarkable('full', {
  html: false, // I'm a crazy person!
  linkify: true,
  typographer: true,
});

elements.push(new Element('markdown', {
  stylesheet: stylesheet,
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
    new Arg('text_style', {
      type: 'text_style',
    }),
  ],
  template: ({args}) => {

    function getContent() {
      let markdown;
      try {
        //const template = handlebars.compile(args.markdown || '');
        //markdown = template({rows: args.dataframe.rows});
        _.templateSettings.interpolate = /{{([\s\S]+?)}}/g;
        const compiled = _.template(args.markdown || '');
        markdown = compiled(args.dataframe.aggregate);
      } catch (e) {
        markdown = args.markdown;
      }

      return {__html: md.render(markdown)};
    }

    return (
      <FontResize height={true} width={true} max={_.get(args.text_style, 'object.fontSize')}>
        <div style={{display: 'inline-block', margin: '2px'}}
          className="rework--markdown"
          dangerouslySetInnerHTML={getContent()}></div>
      </FontResize>
    );
  }
}));
