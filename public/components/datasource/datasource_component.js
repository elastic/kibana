import React from 'react';
import PropTypes from 'prop-types';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
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
    done,
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

  const close = () => {
    if (done) done();
  };

  const save = () => {
    const datasourceAst = getDatasourceFunctionNode(stateDatasource.name, stateArgs);
    setDatasourceAst && setDatasourceAst(datasourceAst);
  };

  if (selecting) {
    return <DatasourceSelector datasources={datasources} onSelect={setSelectedDatasource} />;
  }

  if (previewing) {
    return (
      <DatasourcePreview
        done={() => setPreviewing(false)}
        function={getDatasourceFunctionNode(stateDatasource.name, stateArgs)}
      />
    );
  }

  return (
    <div className="canvas__datasource">
      <div>{stateDatasource.render({ args: stateArgs, updateArgs, datasourceDef })}</div>

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton fill color="secondary" onClick={save}>
            Apply
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton fill color="primary" onClick={() => setPreviewing(true)}>
            Preview
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton fill color="ghost" onClick={close}>
            Cancel
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="logstashInput"
            color="ghost"
            onClick={() => setSelecting(!selecting)}
          >
            Change Datasource
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

DatasourceComponent.propTypes = {
  datasources: PropTypes.array.isRequired,
  datasource: PropTypes.object.isRequired,
  datasourceDef: PropTypes.object.isRequired,
  stateDatasource: PropTypes.object.isRequired,
  selectDatasource: PropTypes.func,
  setDatasourceAst: PropTypes.func,
  stateArgs: PropTypes.object.isRequired,
  updateArgs: PropTypes.func,
  resetArgs: PropTypes.func.isRequired,
  done: PropTypes.func,
  selecting: PropTypes.bool,
  setSelecting: PropTypes.func,
  previewing: PropTypes.bool,
  setPreviewing: PropTypes.func,
};
