import { withProps } from 'recompose';
import { Render as Component } from './render';
import { getType } from '../../../common/types/get_type';

export const Render = withProps(({ expressionOutput }) => ({
  expressionType: getType(expressionOutput),
}))(Component);
