import React from 'react';
import elementTypes from 'plugins/rework/elements/elements';
import Loading from 'plugins/rework/components/loading/loading';
import ScopedStyle from 'plugins/rework/components/scoped_style/scoped_style';
import uuid from 'uuid/v4';
import handlebars from 'handlebars/dist/handlebars';

class Element extends React.PureComponent {
  render() {
    const {type, args} = this.props;
    const userStyle = args ? args._style : {};
    const customStyle = {
      ...userStyle,
      height: '100%',
      width: '100%'
    };
    const elementType = elementTypes.byName[type];
    const ElementContent = args ? elementType.template : () => (<Loading />);

    const styleId = uuid();
    const elementStylesheet = elementType.stylesheet;
    const styleTemplate = handlebars.compile(elementStylesheet);
    if (args) {
      args.foo = '#f00';
    }
    const compiledStyle = styleTemplate(args);

    return (
      <div className="rework--element" style={customStyle} data-style={styleId}>
        <ScopedStyle scope={`[data-style="${styleId}"]`}>{compiledStyle}</ScopedStyle>
        <ElementContent args={args}></ElementContent>
      </div>
    );
  }
}

export default Element;
