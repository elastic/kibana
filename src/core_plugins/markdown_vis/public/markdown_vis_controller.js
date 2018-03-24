import React, { Component } from 'react';
import { Markdown } from 'ui/markdown/markdown';

/**
 * The MarkdownVisComponent renders markdown to HTML and presents it.
 */
class MarkdownVisComponent extends Component {

  /**
   * This method will be called when props or the state has been updated, and
   * we should return whether we want the render method to be called again (true)
   * or if we know that the render method wouldn't produce anything different and
   * we don't need it to be called (false).
   *
   * We only need to render if one of the parameters used in the render function
   * actually changed. So we prevent calling render if none of it changed.
   */
  shouldComponentUpdate(props) {
    const shouldUpdate = props.fontSize !== this.props.fontSize ||
        props.openLinksInNewTab !== this.props.openLinksInNewTab ||
        props.markdown !== this.props.markdown;

    // If we won't update, we need to trigger the renderComplete method here,
    // since we will never render and thus never get to componentDidUpdate.
    if (!shouldUpdate) {
      this.props.renderComplete();
    }

    return shouldUpdate;
  }

  /**
   * Will be called after the first render when the component is present in the DOM.
   *
   * We call renderComplete here, to signal, that we are done with rendering.
   */
  componentDidMount() {
    this.props.renderComplete();
  }

  /**
   * Will be called after the component has been updated and the changes has been
   * flushed into the DOM.
   *
   * We will use this to signal that we are done rendering by calling the
   * renderComplete property.
   */
  componentDidUpdate() {
    this.props.renderComplete();
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
        <Markdown
          data-test-subj="markdownBody"
          style={{ fontSize: `${this.props.fontSize}pt` }}
          markdown={this.props.markdown}
          openLinksInNewTab={this.props.openLinksInNewTab}
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
      openLinksInNewTab={props.vis.params.openLinksInNewTab}
      renderComplete={props.renderComplete}
    />
  );
}
