import React from 'react';
import PropTypes from 'prop-types';
import { ControlLabel, FormControl } from 'react-bootstrap';
import { getSimpleArg, setSimpleArg } from '../../../lib/arg_helpers';
import header from './header.png';
import { TooltipIcon } from '../../../components/tooltip_icon';
import './timelion.less';


const template = ({ args, updateArgs }) => {

  const setArg = (name, value) => {
    updateArgs && updateArgs(Object.assign({},
      args,
      setSimpleArg(name, value),
    ));
  };

  // TODO: This is a terrible way of doing defaults. We need to find a way to read the defaults for the function
  // and set them for the data source UI.
  const getQuery = () => {
    return getSimpleArg('query', args)[0] || '.es(*)';
  };

  const getInterval = () => {
    return getSimpleArg('interval', args)[0] || 'auto';
  };

  return (
    <div>
      <p>
        Canvas integrates with Kibana's Timelion application to allow you to use Timelion queries to pull back timeseries
        data in a tabular format that can be used with Canvas elements.
      </p>

      <div className="canvas__timelion-row">
        <div className="canvas__timelion-query">
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
        {
          // TODO: Time timelion interval picker should be a drop down
        }
        <div className="canvas__timelion-interval">
          <ControlLabel>
            Interval &nbsp;
            <TooltipIcon text="Elasticsearch date math, eg 1w, 5d, 10s, or auto" placement="right"/>
          </ControlLabel>
          <FormControl
            type="text"
            value={getInterval()}
            onChange={(e) => setArg('interval', e.target.value)}
          />
        </div>
      </div>

      <p>
        <small>
          <strong>Tip 1:</strong>
          Timelion requires a time range, you should add a time filter element to your page somewhere, or use the code editor
          to pass in a time filter.<br/>
          <strong>Tip 2:</strong> Some Timelion functions, such as <code>.color()</code>,
          don't translate to a Canvas data table. Anything todo with data manipulation should work grand.
        </small>
      </p>
    </div>
  );
};

template.propTypes = {
  args: PropTypes.object.isRequired,
  updateArgs: PropTypes.func,
};

export const timelion = () => ({
  name: 'timelion',
  displayName: 'Timelion',
  image: header,
  template,
});
