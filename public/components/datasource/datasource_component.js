import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, /*FormControl,*/ ControlLabel, Button, ButtonToolbar } from 'react-bootstrap';

export const DatasourceComponent = (props) => {
  const {
    setDatasourceArgs,
    datasource,
    datasourceDef,
    args,
    stateArgs,
    setAstArgs,
    done,
  } = props;

  const close = () => {
    if (done) done();
  };

  const save = () => {
    if (stateArgs !== args) setDatasourceArgs && setDatasourceArgs(stateArgs);
  };

  return (
    <div>
      <FormGroup controlId="formControlsSelect">
        <ControlLabel>Select Datasource</ControlLabel>
        {datasource.name}
      </FormGroup>
      <div className="canvas__datasource">
        { datasource && datasource.render({ args: stateArgs, onUpdate: setAstArgs, datasourceDef }) }
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
  args: PropTypes.object.isRequired,
  stateArgs: PropTypes.object.isRequired,
  setAstArgs: PropTypes.func.isRequired,
  setDatasourceArgs: PropTypes.func,
  done: PropTypes.func,
};
