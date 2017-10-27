import { pure, compose, lifecycle, withState, branch, renderComponent } from 'recompose';
import { DatasourcePreview as Component } from './datasource_preview';
import { Loading } from '../../loading';
import { PropTypes } from 'prop-types';
import { interpretAst } from '../../../lib/interpreter';

export const DatasourcePreview = compose(
  pure,
  withState('datatable', 'setDatatable'),
  lifecycle({
    componentDidMount() {
      interpretAst({
        type: 'expression',
        chain: [
          this.props.function,
        ],
      }).then(this.props.setDatatable);
    },
  }),
  branch(({ datatable }) => !datatable, renderComponent(Loading))
)(Component);

DatasourcePreview.propTypes = {
  function: PropTypes.object,
};
