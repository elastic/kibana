import { compose, branch, renderComponent } from 'recompose';
import PropTypes from 'prop-types';
import { NoDatasource } from './no_datasource';
import { UnknownArgs } from './unknown_args';
import { DatasourceComponent } from './datasource_component';

const branches = [
  // rendered when there is no datasource in the expression
  branch(({ datasource }) => !datasource, renderComponent(NoDatasource)),

  // rendered when args exist that the datasource hasn't defined
  branch(({ unknownArgs }) => unknownArgs && unknownArgs.length > 0, renderComponent(UnknownArgs)),
];

export const Datasource = compose(...branches)(DatasourceComponent);

Datasource.propTypes = {
  args: PropTypes.object,
  datasource: PropTypes.object,
  unknownArgs: PropTypes.array,
};
