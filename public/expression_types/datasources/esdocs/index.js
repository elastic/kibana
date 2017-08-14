import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, ControlLabel, FormControl } from 'react-bootstrap';
import { getSimpleArg, setSimpleArg } from '../../../lib/arg_helpers';
import { Datasource } from '../../datasource';
import header from './header.png';


const template = ({ args, updateArgs }) => {

  const setArg = (name) => ({ target }) => {
    updateArgs && updateArgs(Object.assign({},
      args,
      setSimpleArg(name, target.value),
    ));
  };

  const getQuery = () => {
    return getSimpleArg('query', args) || '*';
  };

  const getFields = () => {
    return getSimpleArg('fields', args) || '';
  };

  return (
    <div>
      <FormGroup controlId="formControlsSelect">
        <ControlLabel>Query</ControlLabel>
        <FormControl
          type="text"
          value={getQuery()}
          onChange={setArg('query')}
        />
      </FormGroup>
      <FormGroup controlId="formControlsSelect">
        <ControlLabel>Fields</ControlLabel>
        <FormControl
          type="text"
          value={getFields()}
          onChange={setArg('fields')}
        />
      </FormGroup>
    </div>
  );
};

template.propTypes = {
  args: PropTypes.object.isRequired,
  updateArgs: PropTypes.func,
};

export const esdocs = () => new Datasource('esdocs', {
  displayName: 'Elasticsearch Raw Documents',
  image: header,
  template,
});
