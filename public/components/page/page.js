import React from 'react';
import './page.less';
import _ from 'lodash';
import PageElement from 'plugins/rework/components/page_element/page_element';
import Element from 'plugins/rework/components/element/element';

export default React.createClass({
  render() {
    const {page, elements} = this.props;
    const {id, style} = page;

    const orderedElements = page.elements;

    const elementComponents = _.map(orderedElements, (elementId) => {
      const element = elements[elementId];
      const layout = _.pick(element, ['top', 'left', 'height', 'width']);
      return (
        <PageElement key={element.id} id={element.id} layout={layout} style={element.props._style}>
          <Element type={element.type} properties={element.props}></Element>
        </PageElement>
      );
    });
    return (
      <div className="rework--page" style={style}>
        {elementComponents}
      </div>
    );
  }
});
