import React from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonToolbar } from 'react-bootstrap';
import { DatasourceSelector } from './datasource_selector';

export const DatasourceComponent = (props) => {
  const {
    datasources,
    datasource,
    resetArgs,
    datasourceDef,
    stateDatasource,
    selectDatasource,
    args,
    stateArgs,
    updateArgs,
    setDatasourceArgs,
    setDatasourceAst,
    done,
  } = props;

  const setSelectedDatasource = (value) => {
    if (datasource.name === value) {
      // if selecting the current datasource, reset the arguments
      resetArgs && resetArgs();
    } else {
      // otherwise, clear the arguments, the form will update them
      updateArgs && updateArgs({});
    }
    selectDatasource && selectDatasource(datasources.find(d => d.name === value));
  };

  const close = () => {
    if (done) done();
  };

  const save = () => {
    if (stateDatasource !== datasource) {
      // if this is a new datasource, create an AST object and update the whole thing
      const datasourceAst = {
        arguments: stateArgs,
        function: stateDatasource.name,
        type: 'function',
      };
      setDatasourceAst && setDatasourceAst(datasourceAst);
    } else if (stateArgs !== args) {
      // otherwise, simply update the arguments
      setDatasourceArgs && setDatasourceArgs(stateArgs);
    }
  };

  return (
    <div>
      <DatasourceSelector selected={stateDatasource} datasources={datasources} onSelect={setSelectedDatasource} />
      <div className="canvas__datasource">
        {stateDatasource.render({ args: stateArgs, updateArgs, datasourceDef })}
      </div>
      <ButtonToolbar>
        <Button bsStyle="primary" onClick={save}> Save</Button>
        <Button onClick={close}> Done</Button>
      </ButtonToolbar>
    </div>
  );
};

DatasourceComponent.propTypes = {
  datasources: PropTypes.array.isRequired,
  datasource: PropTypes.object.isRequired,
  datasourceDef: PropTypes.object.isRequired,
  stateDatasource: PropTypes.object.isRequired,
  selectDatasource: PropTypes.func,
  setDatasourceArgs: PropTypes.func,
  setDatasourceAst: PropTypes.func,
  args: PropTypes.object.isRequired,
  stateArgs: PropTypes.object.isRequired,
  updateArgs: PropTypes.func,
  resetArgs: PropTypes.func.isRequired,
  done: PropTypes.func,
};
