import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, ControlLabel, FormControl } from 'react-bootstrap';
import { getSimpleArg, setSimpleArg } from '../../../lib/arg_helpers';
import { Datasource } from '../../datasource';
import header from './header.png';
import { ESFieldsSelect } from '../../../components/es_fields_select';


const template = ({ args, updateArgs }) => {

  const setArg = (name, value) => {
    updateArgs && updateArgs(Object.assign({},
      args,
      setSimpleArg(name, value),
    ));
  };

  const getQuery = () => {
    return getSimpleArg('query', args) || '*';
  };

  const getFields = () => {
    const commas = getSimpleArg('fields', args)[0] || '';
    return commas.split(',').map(str => str.trim());
  };

  return (
    <div>
      <FormGroup controlId="formControlsSelect">
        <ControlLabel>Query</ControlLabel>
        <FormControl
          type="text"
          value={getQuery()}
          onChange={(e) => setArg('query', e.target.value)}
        />
      </FormGroup>

      <label>Fields</label>
      <ESFieldsSelect onChange={(fields) => setArg('fields', fields.join(', '))} selected={getFields()}/>
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
