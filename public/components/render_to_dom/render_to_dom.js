import React from 'react';
import PropTypes from 'prop-types';

export class RenderToDom extends React.Component {
  static propTypes = {
    domNode: PropTypes.object,
    setDomNode: PropTypes.func.isRequired,
    render: PropTypes.func.isRequired,
    style: PropTypes.object,
  };

  shouldComponentUpdate(nextProps) {
    return this.props.domNode !== nextProps.domNode;
  }

  componentDidUpdate() {
    // Calls render function once we have the reference to the DOM element to render into
    if (this.props.domNode) this.props.render(this.props.domNode);
  }

  render() {
    const linkRef = refNode => {
      if (!this.props.domNode && refNode) {
        // Initialize the domNode property. This should only happen once, even if config changes.
        this.props.setDomNode(refNode);
      }
    };

    return <div className="render_to_dom" ref={linkRef} style={this.props.style} />;
  }
}
