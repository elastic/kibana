import { connect } from 'react-redux';
import { withState, compose } from 'recompose';
import { get } from 'lodash';
import { Datasource as Component } from './datasource';
import { datasourceRegistry } from '../../expression_types';
import { getSelectedElement, getSelectedPage } from '../../state/selectors/workpad';
import { getServerFunctions } from '../../state/selectors/app';
import { setArgumentAtIndex } from '../../state/actions/elements';

const mapStateToProps = (state) => ({
  element: getSelectedElement(state),
  pageId: getSelectedPage(state),
  serverFunctions: getServerFunctions(state),
});

const mapDispatchToProps = (dispatch) => ({
  setArgumentAtIndex: props => arg => dispatch(setArgumentAtIndex({ ...props, arg })),
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { element, pageId, serverFunctions } = stateProps;
  const { setArgumentAtIndex } = dispatchProps;

  // find the matching datasource from the expression AST
  const datasourceAst = get(element, 'ast.chain', []).map((astDef, i) => {
    // if it's not a function, it's can't be a datasource
    if (astDef.type !== 'function') return;
    const args = astDef.arguments;

    // if there's no matching datasource in the registry, we're done
    const datasource = datasourceRegistry.get(astDef.function);
    if (!datasource) return;

    const datasourceDef = serverFunctions.find(fn => fn.name === datasource.name);
    const knownArgs = datasourceDef && Object.keys(datasourceDef.args);
    const unknownArgs = datasourceDef && Object.keys(args).filter(arg => knownArgs.indexOf(arg) === -1);

    // keep track of the ast, the ast index2, and the datasource
    return {
      datasource,
      datasourceDef,
      unknownArgs,
      args,
      expressionIndex: i,
    };
  }).filter(Boolean)[0];

  return Object.assign({}, ownProps, stateProps, dispatchProps, {
    ...datasourceAst,
    datasources: datasourceRegistry.toArray(),
    setDatasourceArgs: setArgumentAtIndex({
      pageId,
      element,
      index: datasourceAst && datasourceAst.expressionIndex,
    }),
  });
};

export const Datasource = compose(
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
  withState('stateArgs', 'setAstArgs', ({ args }) => args)
)(Component);
