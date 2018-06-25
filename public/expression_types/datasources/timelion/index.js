import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiFieldText, EuiCode } from '@elastic/eui';
import { getSimpleArg, setSimpleArg } from '../../../lib/arg_helpers';
import { TooltipIcon } from '../../../components/tooltip_icon';
import { templateFromReactComponent } from '../../../lib/template_from_react_component';
import header from './header.png';

const TimelionDatasource = ({ args, updateArgs }) => {
  const setArg = (name, value) => {
    updateArgs &&
      updateArgs({
        ...args,
        ...setSimpleArg(name, value),
      });
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
        Canvas integrates with Kibana's Timelion application to allow you to use Timelion queries to
        pull back timeseries data in a tabular format that can be used with Canvas elements.
      </p>

      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={
              <Fragment>
                Query &nbsp;
                <TooltipIcon text="Lucene Query String syntax" placement="right" />
              </Fragment>
            }
            helpText={
              <small>
                <strong>Tip 1:</strong> Timelion requires a time range, you should add a time filter
                element to your page somewhere, or use the code editor to pass in a time filter.<br />
                <strong>Tip 2:</strong> Some Timelion functions, such as <EuiCode>.color()</EuiCode>,
                don't translate to a Canvas data table. Anything todo with data manipulation should
                work grand.
              </small>
            }
          >
            <EuiFieldText
              fullWidth
              value={getQuery()}
              onChange={e => setArg('query', e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        {
          // TODO: Time timelion interval picker should be a drop down
        }
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={
              <Fragment>
                Interval &nbsp;
                <TooltipIcon
                  text="Elasticsearch date math, eg 1w, 5d, 10s, or auto"
                  placement="right"
                />
              </Fragment>
            }
          >
            <EuiFieldText
              value={getInterval()}
              onChange={e => setArg('interval', e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

TimelionDatasource.propTypes = {
  args: PropTypes.object.isRequired,
  updateArgs: PropTypes.func,
};

export const timelion = () => ({
  name: 'timelion',
  displayName: 'Timelion',
  help: 'Use timelion syntax to retrieve a timeseries',
  image: header,
  template: templateFromReactComponent(TimelionDatasource),
});
