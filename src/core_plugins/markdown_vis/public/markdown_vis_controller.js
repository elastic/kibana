import MarkdownIt from 'markdown-it';
import React, { Component } from 'react';

const markdownIt = new MarkdownIt({
  html: false,
  linkify: true
});

/**
 * The MarkdownVisComponent renders markdown to HTML and presents it.
 */
class MarkdownVisComponent extends Component {

  constructor(props) {
    super(props);
    // Transform the markdown from parameters into HTML and store it in the state.
    this.state = {
      renderedMarkdown: this.transformMarkdown(props)
    };
  }

  /**
   * This method is used to actually render markdown from the passed parameter
   * into HTML. It will just return an empty string when the markdown is empty.
   * Since we want to use this with dangerouslySetInnerHTML, this method returns
   * the required object format with an __html key in it.
   */
  transformMarkdown(params) {
    if (!params.markdown) {
      return { __html: '' };
    }
    return { __html: markdownIt.render(params.markdown) };
  }

  /**
   * This method will be called, when the (the reference of) the props passed to
   * the component are about to change. It can be used to copy over properties
   * to the state if needed. That's why we need the wrapper component, that
   * passed in the required parameters as separate properties, otherwise this
   * would never be triggered.
   *
   * In our case we check if the new passed markdown has changed from the currently
   * used markdown. If so we transform that markdown to HTML and update it in the state.
   * That way we only need to render markdown into HTML when the parameter actually
   * changes, and not every time we render the component (e.g. due to resize changes).
   */
  componentWillReceiveProps(props) {
    if (props.markdown !== this.props.markdown) {
      this.setState({
        renderedMarkdown: this.transformMarkdown(props)
      });
    }
  }

  /**
   * This method will be called when props or the state has been updated, and
   * we should return whether we want the render method to be called again (true)
   * or if we know that the render method wouldn't produce anything different and
   * we don't need it to be called (false).
   *
   * We only need to render if one of the parameters used in the render function
   * actually changed. So we prevent calling render if none of it changed.
   */
  shouldComponentUpdate(props, state) {
    return props.fontSize !== this.props.fontSize ||
        state.renderedMarkdown !== this.state.renderedMarkdown;
  }

  /**
   * Render the actual HTML.
   * Note: if only fontSize parameter has changed, this method will be called
   * and return the appropriate JSX, but React will detect, that only the
   * style argument has been updated, and thus only set this attribute to the DOM.
   */
  render() {
    return (
      <div className="markdown-vis">
        <div
          className="markdown-body"
          data-test-subj="markdownBody"
          style={{ fontSize: `${this.props.fontSize}pt` }}
          dangerouslySetInnerHTML={this.state.renderedMarkdown}
        />
      </div>
    );
  }
}

/**
 * This is a wrapper component, that is actually used as the visualization.
 * The sole purpose of this component is to extract all required parameters from
 * the properties and pass them down as separate properties to the actual component.
 * That way the actual (MarkdownVisComponent) will properly trigger it's prop update
 * callback (componentWillReceiveProps) if one of these params change. It wouldn't
 * trigger otherwise (e.g. it doesn't for this wrapper), since it only triggers
 * if the reference to the prop changes (in this case the reference to vis).
 *
 * The way React works, this wrapper nearly brings no overhead, but allows us
 * to use proper lifecycle methods in the actual component.
 */
export function MarkdownVisWrapper(props) {
  return (
    <MarkdownVisComponent
      fontSize={props.vis.params.fontSize}
      markdown={props.vis.params.markdown}
    />
  );
}
