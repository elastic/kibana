import React from 'react';
import elementTypes from 'plugins/rework/elements/elements';
import Loading from 'plugins/rework/components/loading/loading';
import ScopedStyle from 'plugins/rework/components/scoped_style/scoped_style';
import uuid from 'uuid/v4';
import handlebars from 'handlebars/dist/handlebars';
import Warning from 'plugins/rework/components/warning/warning';

export default class Element extends React.PureComponent {
  constructor(props) {
    super(props);
  }

  componentWillMount() {
    const {type} = this.props;
    this.styleId = `style-${uuid()}`;
    this.elementType = elementTypes.byName[type];
    this.template = this.props.args ? this.elementType.template : () => (<Loading />);
  }

  shouldComponentUpdate(nextProps) {
    return nextProps.args !== this.props.args;
  }

  componentWillUpdate(nextProps) {
    if (!this.props.args && nextProps.args) this.template = this.elementType.template;
  }

  render() {
    const {args} = this.props;

    if (!this.elementType) return (<Warning>Unknown Element Type</Warning>);

    const ElementContent = this.template;

    // Build the inline style for the wrapper
    const containerStyle = args ? args._container_style : {};
    const elementStyle = {
      ...containerStyle,
      height: '100%',
      width: '100%'
    };

    // Build the templatable stylesheet
    const styleSheet = this.elementType.stylesheet;
    const customStyleSheet = args ? args._custom_style : '';

    const styleTemplate = handlebars.compile(styleSheet);
    const scopedStyleSheet = styleTemplate(args);

    return (
      <div className="rework--element" style={elementStyle} data-style={this.styleId}>
        <ScopedStyle scope={`[data-style="${this.styleId}"]`} stylesheet={scopedStyleSheet}></ScopedStyle>
        <ScopedStyle scope={`[data-style="${this.styleId}"]`} stylesheet={customStyleSheet}></ScopedStyle>
        <ElementContent
          key={this.styleId}
          args={args}
          filter={this.props.filter}
          setArg={this.props.setArg}
          setFilter={this.props.setFilter}
        ></ElementContent>
      </div>
    );
  }
};
