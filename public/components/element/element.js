import React from 'react';
import elementTypes from 'plugins/rework/elements/elements';
import Loading from 'plugins/rework/components/loading/loading';
import ScopedStyle from 'plugins/rework/components/scoped_style/scoped_style';
import uuid from 'uuid/v4';
import handlebars from 'handlebars/dist/handlebars';

class Element extends React.PureComponent {
  render() {
    const {type, args} = this.props;
    const elementType = elementTypes.byName[type];
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
    const styleId = uuid();
    const styleSheet = elementType.stylesheet;
    const styleTemplate = handlebars.compile(styleSheet);
    const scopedStyleSheet = styleTemplate(args);

    return (
      <div className="rework--element" style={elementStyle} data-style={styleId}>
        <ScopedStyle scope={`[data-style="${styleId}"]`}>{scopedStyleSheet}</ScopedStyle>
        <ElementContent args={args}></ElementContent>
      </div>
    );
  }
}

export default Element;
