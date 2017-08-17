import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, ControlLabel, FormControl } from 'react-bootstrap';
import { getSimpleArg, setSimpleArg } from '../../../lib/arg_helpers';
import { Datasource } from '../../datasource';
import header from './header.png';
import { ESFieldsSelect } from '../../../components/es_fields_select';
import { ESIndexSelect } from '../../../components/es_index_select';
import { TooltipIcon } from '../../../components/tooltip_icon';
import './esdocs.less';


const template = ({ args, updateArgs }) => {

  const setArg = (name, value) => {
    console.log('setting', name, value);
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

  const fields = getFields();
  const index = getSimpleArg('index', args)[0];

  return (
    <div>
      <p>
        The Elasticsearch Docs datasource is used to pull documents directly from Elasticsearch without the use of aggregations.
        It is best used with low volume datasets and in situations where you need to view raw documents or plot exact, non-aggregated
        values on a chart.
      </p>

      <div className="canvas__esdocs--index_query">
        <div className="canvas__esdocs--index">
          <label>Index &nbsp;
          <TooltipIcon
            text="The index to query, as well as the field available in the selector below"
            placement="right"/>
          </label>
          <ESIndexSelect value={index} onChange={index => setArg('index', index)}/>
        </div>

        <div className="canvas__esdocs--query">
          <FormGroup controlId="formControlsSelect">
            <ControlLabel>
              Query &nbsp;
              <TooltipIcon text="Lucene Query String syntax" placement="right"/>
            </ControlLabel>
            <FormControl
              type="text"
              value={getQuery()}
              onChange={(e) => setArg('query', e.target.value)}
            />
          </FormGroup>
        </div>
      </div>



      <label>Fields &nbsp;
        { fields.length <= 10 ?
          (<TooltipIcon
            text="The fields to extract. Kibana scripted fields are not currently available"
            placement="right"/>)
          :
          (<TooltipIcon
            icon="warning"
            text="This datasource performs best with 10 or fewer fields"
            placement="right"/>)
        }
      </label>
      <ESFieldsSelect
        index={index}
        onChange={(fields) => setArg('fields', fields.join(', '))}
        selected={fields}
      />
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
