import React from 'react';
import elementTypes from 'plugins/rework/elements/elements';
import Loading from 'plugins/rework/components/loading/loading';
import ScopedStyle from 'plugins/rework/components/scoped_style/scoped_style';
import uuid from 'uuid/v4';
import handlebars from 'handlebars/dist/handlebars';

const Element = React.createClass({
  getInitialState() {
    const {type} = this.props;
    return {
      styleId: uuid(),
      elementType: elementTypes.byName[type]
    };
  },
  render() {
    const {type, args, setArg} = this.props;
    const {styleId, elementType} = this.state;
    const ElementContent = args ? elementType.template : () => (<Loading />);

    // Build the inline style for the wrapper
    const customStyle = args ? args._custom_style : {};
    const containerStyle = args ? args._container_style : {};
    const elementStyle = {
      ...containerStyle,
      ...customStyle,
      height: '100%',
      width: '100%'
    };

    // Build the templatable stylesheet
    const styleSheet = elementType.stylesheet;
    const styleTemplate = handlebars.compile(styleSheet);
    const scopedStyleSheet = styleTemplate(args);

    return (
      <div className="rework--element" style={elementStyle} data-style={styleId}>
        <ScopedStyle scope={`[data-style="${styleId}"]`}>{scopedStyleSheet}</ScopedStyle>
        <ElementContent args={args} setArg={setArg}></ElementContent>
      </div>
    );
  }
});

export default Element;
