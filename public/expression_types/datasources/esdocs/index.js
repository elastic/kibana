import React from 'react';
import PropTypes from 'prop-types';
import { ControlLabel, FormControl } from 'react-bootstrap';
import { getSimpleArg, setSimpleArg } from '../../../lib/arg_helpers';
import header from './header.png';
import { ESFieldsSelect } from '../../../components/es_fields_select';
import { ESFieldSelect } from '../../../components/es_field_select';
import { ESIndexSelect } from '../../../components/es_index_select';
import { TooltipIcon } from '../../../components/tooltip_icon';
import './esdocs.less';


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
    if (commas.length === 0) return [];
    return commas.split(',').map(str => str.trim());
  };

  const getSort = () => {
    const commas = getSimpleArg('sort', args)[0] || '_score,desc';
    return commas.split(',').map(str => str.trim());
  };


  const fields = getFields();
  const sort = getSort();
  const index = getSimpleArg('index', args)[0];

  return (
    <div>
      <p>
        The Elasticsearch Docs datasource is used to pull documents directly from Elasticsearch without the use of aggregations.
        It is best used with low volume datasets and in situations where you need to view raw documents or plot exact, non-aggregated
        values on a chart.
      </p>

      <div className="canvas__esdocs--row">
        <div className="canvas__esdocs--index">
          <label>Index &nbsp;
          <TooltipIcon
            text="The index pattern to query. Time filters will apply to the timefield from this pattern."
            placement="right"/>
          </label>
          <ESIndexSelect value={index} onChange={index => setArg('index', index)}/>
        </div>

        <div className="canvas__esdocs--query">
            <ControlLabel>
              Query &nbsp;
              <TooltipIcon text="Lucene Query String syntax" placement="right"/>
            </ControlLabel>
            <FormControl
              type="text"
              value={getQuery()}
              onChange={(e) => setArg('query', e.target.value)}
            />
        </div>

        <div className="canvas__esdocs--sort-field">
          <label>Sort &nbsp;
          <TooltipIcon
            text="Document sort order, field and direction"
            placement="right"/>
          </label>
          <ESFieldSelect index={index} value={sort[0]} onChange={(field) => setArg('sort', [field, sort[1]].join(', '))}/>
        </div>

        <div className="canvas__esdocs--sort-dir">
            <ControlLabel>
              &nbsp;
            </ControlLabel>
            <FormControl
              componentClass="select"
              value={sort[1]}
              onChange={(e) => setArg('sort', [sort[0], e.target.value].join(', '))}
            >
              <option value="asc">asc</option>
              <option value="desc">desc</option>
            </FormControl>
        </div>
      </div>


      <div>
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
    </div>
  );
};

template.propTypes = {
  args: PropTypes.object.isRequired,
  updateArgs: PropTypes.func,
};

export const esdocs = () => ({
  name: 'esdocs',
  displayName: 'Elasticsearch Raw Documents',
  image: header,
  template,
});
