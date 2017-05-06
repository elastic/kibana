import { withProps, renderComponent, branch } from 'recompose';
import { Render as Component } from './render';
import { getType } from '../../../common/types/get_type';
import { Loading } from '../loading';

const whenReady = () =>
  branch(
    props => props.expressionType !== 'render',
    renderComponent(Loading)
  );

export const Render = withProps(({ expressionOutput }) => ({
  expressionType: getType(expressionOutput),
}))(whenReady()(Component));
