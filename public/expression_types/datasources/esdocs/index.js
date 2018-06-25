import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldText,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import { getSimpleArg, setSimpleArg } from '../../../lib/arg_helpers';
import { ESFieldsSelect } from '../../../components/es_fields_select';
import { ESFieldSelect } from '../../../components/es_field_select';
import { ESIndexSelect } from '../../../components/es_index_select';
import { TooltipIcon } from '../../../components/tooltip_icon';
import { templateFromReactComponent } from '../../../lib/template_from_react_component';
import header from './header.png';

const EsdocsDatasource = ({ args, updateArgs }) => {
  const setArg = (name, value) => {
    updateArgs &&
      updateArgs({
        ...args,
        ...setSimpleArg(name, value),
      });
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
  const [query] = getQuery();

  return (
    <Fragment>
      <p>
        The Elasticsearch Docs datasource is used to pull documents directly from Elasticsearch
        without the use of aggregations. It is best used with low volume datasets and in situations
        where you need to view raw documents or plot exact, non-aggregated values on a chart.
      </p>

      <EuiFlexGroup gutterSize="s" alignItems="flexEnd" className="canvas__esdocs--row">
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={
              <Fragment>
                Index &nbsp;
                <TooltipIcon
                  text="The index pattern to query. Time filters will apply to the timefield from this pattern."
                  placement="right"
                />
              </Fragment>
            }
          >
            <ESIndexSelect value={index} onChange={index => setArg('index', index)} />
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFormRow
            label={
              <Fragment>
                Query &nbsp;
                <TooltipIcon text="Lucene Query String syntax" placement="right" />
              </Fragment>
            }
            fullWidth
          >
            <EuiFieldText fullWidth value={query} onChange={e => setArg('query', e.target.value)} />
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={
              <Fragment>
                Sort &nbsp;
                <TooltipIcon text="Document sort order, field and direction" placement="right" />
              </Fragment>
            }
          >
            <ESFieldSelect
              index={index}
              value={sort[0]}
              onChange={field => setArg('sort', [field, sort[1]].join(', '))}
            />
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace>
            <EuiSelect
              defaultValue={sort[1]}
              options={['asc', 'desc'].map(value => ({ value, text: value }))}
              onChange={e => setArg('sort', [sort[0], e.target.value].join(', '))}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiFormRow
        label={
          <Fragment>
            Fields &nbsp;
            {fields.length <= 10 ? (
              <TooltipIcon
                text="The fields to extract. Kibana scripted fields are not currently available"
                placement="right"
              />
            ) : (
              <TooltipIcon
                icon="warning"
                text="This datasource performs best with 10 or fewer fields"
                placement="right"
              />
            )}
          </Fragment>
        }
        fullWidth
      >
        <ESFieldsSelect
          index={index}
          onChange={fields => setArg('fields', fields.join(', '))}
          selected={fields}
        />
      </EuiFormRow>
    </Fragment>
  );
};

EsdocsDatasource.propTypes = {
  args: PropTypes.object.isRequired,
  updateArgs: PropTypes.func,
};

export const esdocs = () => ({
  name: 'esdocs',
  displayName: 'Elasticsearch Raw Documents',
  help: 'Pull back raw documents from elasticsearch',
  image: header,
  template: templateFromReactComponent(EsdocsDatasource),
});
