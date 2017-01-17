import React from 'react';
import elements from 'plugins/rework/elements/elements';
import Loading from 'plugins/rework/components/loading/loading';

class Element extends React.PureComponent {
  render() {
    const {type, args} = this.props;
    const ElementContent = args ? elements.byName[type].template : () => (<Loading />);
    return (
      <div className="rework--element">
        <ElementContent args={args}></ElementContent>
      </div>
    );
  }
}

export default Element;
