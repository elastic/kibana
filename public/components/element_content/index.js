import { compose, withProps } from 'recompose';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import { renderFunctionsRegistry } from '../../lib/render_functions_registry';
import { ElementContent as Component } from './element_content';

export const ElementContent = compose(
  withProps(({ renderable }) => ({
    renderFunction: renderFunctionsRegistry.get(get(renderable, 'as')),
  }))
)(Component);

ElementContent.propTypes = {
  renderable: PropTypes.object,
  size: PropTypes.object,
  handlers: PropTypes.object,
  state: PropTypes.string,
};
