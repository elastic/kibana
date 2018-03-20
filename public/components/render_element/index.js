import { compose, withPropsOnChange, withProps } from 'recompose';
import PropTypes from 'prop-types';
import { notify } from '../../lib/notify';
import { RenderElement as Component } from './render_element';
import { ElementHandlers } from './lib/handlers';
export const RenderElement = compose(
  withPropsOnChange(
    () => false,
    () => ({
      elementHandlers: new ElementHandlers(),
    })
  ),
  withProps(({ handlers, elementHandlers }) => ({
    handlers: Object.assign(elementHandlers, handlers, { done: () => {} }),
    onError: message => notify.error(message),
  }))
)(Component);

RenderElement.propTypes = {
  handlers: PropTypes.object,
};
