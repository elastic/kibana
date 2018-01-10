import { pure, compose, lifecycle, withState, branch, renderComponent } from 'recompose';
import { PropTypes } from 'prop-types';
import { Loading } from '../../loading';
import { interpretAst } from '../../../lib/interpreter';
import { DatasourcePreview as Component } from './datasource_preview';

export const DatasourcePreview = compose(
  pure,
  withState('datatable', 'setDatatable'),
  lifecycle({
    componentDidMount() {
      interpretAst({
        type: 'expression',
        chain: [this.props.function],
      }).then(this.props.setDatatable);
    },
  }),
  branch(({ datatable }) => !datatable, renderComponent(Loading))
)(Component);

DatasourcePreview.propTypes = {
  function: PropTypes.object,
};
