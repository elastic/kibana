import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';
import { DatasourceSelector } from './datasource_selector';
import { DatasourcePreview } from './datasource_preview';

export const DatasourceComponent = props => {
  const {
    datasources,
    datasource,
    resetArgs,
    datasourceDef,
    stateDatasource,
    selectDatasource,
    stateArgs,
    updateArgs,
    setDatasourceAst,
    selecting,
    setSelecting,
    previewing,
    setPreviewing,
  } = props;

  const getDatasourceFunctionNode = (name, args) => ({
    arguments: args,
    function: name,
    type: 'function',
  });

  const setSelectedDatasource = value => {
    if (datasource.name === value) {
      // if selecting the current datasource, reset the arguments
      resetArgs && resetArgs();
    } else {
      // otherwise, clear the arguments, the form will update them
      updateArgs && updateArgs({});
    }
    selectDatasource && selectDatasource(datasources.find(d => d.name === value));
    setSelecting(false);
  };

  const save = () => {
    const datasourceAst = getDatasourceFunctionNode(stateDatasource.name, stateArgs);
    setDatasourceAst && setDatasourceAst(datasourceAst);
  };

  if (selecting) {
    return <DatasourceSelector datasources={datasources} onSelect={setSelectedDatasource} />;
  }

  return (
    <Fragment>
      <EuiPanel>
        <EuiButtonEmpty
          iconSide="right"
          flush="left"
          iconType="sortRight"
          onClick={() => setSelecting(!selecting)}
        >
          Change your data source
        </EuiButtonEmpty>
        <EuiSpacer size="s" />
        {stateDatasource.render({ args: stateArgs, updateArgs, datasourceDef })}
        <EuiSpacer size="m" />
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButton size="s" onClick={() => setPreviewing(true)} icon="check">
              Preview
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton size="s" color="secondary" fill onClick={save} icon="check">
              Save
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <DatasourcePreview
        show={previewing}
        done={() => setPreviewing(false)}
        function={getDatasourceFunctionNode(stateDatasource.name, stateArgs)}
      />
    </Fragment>
  );
};

DatasourceComponent.propTypes = {
  datasources: PropTypes.array.isRequired,
  datasource: PropTypes.object.isRequired,
  datasourceDef: PropTypes.object.isRequired,
  stateDatasource: PropTypes.shape({
    name: PropTypes.string.isRequired,
    render: PropTypes.func.isRequired,
  }).isRequired,
  selectDatasource: PropTypes.func,
  setDatasourceAst: PropTypes.func,
  stateArgs: PropTypes.object.isRequired,
  updateArgs: PropTypes.func,
  resetArgs: PropTypes.func.isRequired,
  selecting: PropTypes.bool,
  setSelecting: PropTypes.func,
  previewing: PropTypes.bool,
  setPreviewing: PropTypes.func,
};
