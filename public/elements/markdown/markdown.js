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
import observeResize from 'plugins/timelion/lib/observe_resize';
import $ from 'jquery';



const md = new Remarkable('full', {
  html: false, // I'm a crazy person!
  linkify: true,
  typographer: true,
});

elements.push(new Element('markdown', {
  stylesheet: stylesheet,
  displayName: 'Markdown',
  icon: icon,
  args: [
    new Arg('markdown', {
      type: 'string',
      expand: true,
      help: `
      <p>Standard markdown, expanded with templating.</p>
      <p>
        You can access aggregated dataframe column values here using simple aggregator functions such as
        <code>sum</code>, <code>min</code>, <code>max</code>, <code>avg</code> and <code>last</code>. For example:<br>
        <code>{{sum('price')}}</code>
      </p>
      <p>
        You can also do grouping, with the <code>by</code> function. For example:<br>
         <code>{{by('model').avg('price').Impreza}}</code>
      </p>`,
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
  template: class Markdown extends React.PureComponent {

    getContent() {
      const {args} = this.props;
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

    componentDidMount() {
      this.cancelResize = observeResize($(this.refs.content), this.forceUpdate.bind(this), 10);
    }

    componentWillUnmount() {
      this.cancelResize();
    }

    render() {
      return (
        <FontResize height={true} width={true} max={_.get(this.props.args.text_style, 'object.fontSize')}>
          <div style={{display: 'inline-block', margin: '2px'}}
            ref="content"
            className="rework--markdown"
            dangerouslySetInnerHTML={this.getContent()}></div>
        </FontResize>
      );
    }

  }
}));
