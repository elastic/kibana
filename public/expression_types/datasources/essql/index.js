import React from 'react';
import PropTypes from 'prop-types';
import { ControlLabel } from 'react-bootstrap';
import { getSimpleArg, setSimpleArg } from 'plugins/canvas/lib/arg_helpers';
import { TooltipIcon } from 'plugins/canvas/components/tooltip_icon';
import { templateFromReactComponent } from '../../../lib/template_from_react_component';
import './essql.less';
import header from './header.png';

const EssqlDatasource = ({ args, updateArgs }) => {
  const setArg = (name, value) => {
    updateArgs &&
      updateArgs({
        ...args,
        ...setSimpleArg(name, value),
      });
  };

  // TODO: This is a terrible way of doing defaults. We need to find a way to read the defaults for the function
  // and set them for the data source UI.
  const getArgName = () => {
    if (getSimpleArg('_', args)[0]) return '_';
    if (getSimpleArg('q', args)[0]) return 'q';
    return 'query';
  };

  const getQuery = () => {
    return getSimpleArg(getArgName(), args)[0] || '';
  };

  return (
    <div>
      <div className="canvas__essql-row">
        <div className="canvas__essql-query">
          <ControlLabel>
            Query &nbsp;
            <TooltipIcon text="Elasticsearch SQL" placement="right" />
          </ControlLabel>
          <textarea
            className="textarea form-control"
            value={getQuery()}
            onChange={e => setArg(getArgName(), e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

EssqlDatasource.propTypes = {
  args: PropTypes.object.isRequired,
  updateArgs: PropTypes.func,
};

export const essql = () => ({
  name: 'essql',
  displayName: 'Elasticsearch SQL',
  help: 'Use Elasticsearch SQL to get a datatable',
  image: header,
  template: templateFromReactComponent(EssqlDatasource),
});
