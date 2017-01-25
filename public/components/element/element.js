import React from 'react';
import elements from 'plugins/rework/elements/elements';
import Loading from 'plugins/rework/components/loading/loading';

class Element extends React.PureComponent {
  render() {
    const {type, args} = this.props;
    const userStyle = args ? args._style : {};
    const elementStyle = {
      ...userStyle,
      height: '100%',
      width: '100%'
    };
    const ElementContent = args ? elements.byName[type].template : () => (<Loading />);
    return (
      <div className="rework--element" style={elementStyle}>
        <ElementContent args={args}></ElementContent>
      </div>
    );
  }
}

export default Element;
