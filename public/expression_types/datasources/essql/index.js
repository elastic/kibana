import React from 'react';
import PropTypes from 'prop-types';
import { EuiFormRow, EuiTextArea } from '@elastic/eui';
import { getSimpleArg, setSimpleArg } from 'plugins/canvas/lib/arg_helpers';
import { templateFromReactComponent } from '../../../lib/template_from_react_component';

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
    let query = getSimpleArg(getArgName(), args)[0];

    if (!query) {
      query = 'SELECT * FROM logstash*';
      setArg(getArgName(), query);
    }

    return query;
  };

  return (
    <EuiFormRow label="Elasticsearch SQL query">
      <EuiTextArea
        className="canvasTextArea--code"
        value={getQuery()}
        onChange={e => setArg(getArgName(), e.target.value)}
      />
    </EuiFormRow>
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
  // Replace this with a SQL logo when we have one in EUI
  image: 'logoElasticsearch',
  template: templateFromReactComponent(EssqlDatasource),
});
