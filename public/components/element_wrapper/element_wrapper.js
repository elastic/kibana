import React from 'react';
import PropTypes from 'prop-types';
import { compose, branch, renderComponent } from 'recompose';
import { getError, getValue } from '../../lib/resolved_arg';
import { InvalidExpression } from './invalid_element';
import { RenderElement } from '../render_element';
import { get } from 'lodash';
import { Loading } from '../loading';
import { elements as elementsRegistry } from '../../lib/elements';
import './element_wrapper.less';

/*
  Branches
  Short circut rendering of the element if the element isn't ready or isn't valid.
*/
const loadingBranch = branch(({ renderable }) => !renderable || !getValue(renderable), renderComponent(Loading));
const errorBranch =  branch(({ renderable }) => {
  const renderableConfig = getValue(renderable);

  // Show an error if...
  return (
    getError(renderable) !== null || // The renderable has an error property that is not null
    renderableConfig.type !== 'render' || // The renderable isn't, well, renderable
    !elementsRegistry.get(get(getValue(renderable), 'as')) // We can't find an element in the registry for this
  );
}, renderComponent(InvalidExpression));


const ElementWrapperComponent = (props) => {
  const { element, selectedElement, selectElement, removeElement, renderable } = props;

  // TODO: pass in render element dimensions
  const selectedClassName = element.id === selectedElement ? 'selected' : '';

  const renderableConfig = getValue(renderable);
  const elementDef = elementsRegistry.get(get(getValue(renderable), 'as'));

  return (
    <div className={`canvas__workpad--element ${selectedClassName}`} onClick={selectElement}>
      <div style={{ textAlign: 'right' }}>
        <i className="fa fa-times-circle" style={{ cursor: 'pointer' }} onClick={removeElement}/>
      </div>
      <RenderElement renderFn={elementDef.render} destroyFn={elementDef.destroy} config={renderableConfig.value} done={() => {}}/>
    </div>
  );
};

ElementWrapperComponent.propTypes = {
  element: PropTypes.object.isRequired,
  renderable: PropTypes.object,
  selectedElement: PropTypes.string,
  selectElement: PropTypes.func,
  removeElement: PropTypes.func,
};

export const ElementWrapper = compose(
  loadingBranch,
  errorBranch,
)(ElementWrapperComponent);
