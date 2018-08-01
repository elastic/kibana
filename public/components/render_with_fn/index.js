import { compose, withPropsOnChange, withProps } from 'recompose';
import PropTypes from 'prop-types';
import { notify } from '../../lib/notify';
import { RenderWithFn as Component } from './render_with_fn';
import { ElementHandlers } from './lib/handlers';

export const RenderWithFn = compose(
  withPropsOnChange(
    () => false,
    () => ({
      elementHandlers: new ElementHandlers(),
    })
  ),
  withProps(({ handlers, elementHandlers }) => ({
    handlers: Object.assign(elementHandlers, handlers),
    onError: notify.error,
  }))
)(Component);

RenderWithFn.propTypes = {
  handlers: PropTypes.object,
  elementHandlers: PropTypes.object,
};
