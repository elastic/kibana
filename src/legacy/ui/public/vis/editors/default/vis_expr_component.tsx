/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { PersistedState } from 'ui/persisted_state';
import { Vis, VisualizationController } from 'ui/vis';
import { Expression } from 'plugins/canvas/components/expression/expression';
import { getFunctionDefinitions } from 'plugins/canvas/lib/function_definitions';
import { buildPipeline } from 'ui/visualize/loader/pipeline_helpers';


class VisExprComponent extends React.Component {
  private containerDiv = React.createRef<HTMLDivElement>();

  constructor(props: VisExprComponentProps) {
    super(props);

    this.state = {
      functionDefinitions: [],
      autoComplete: true,
    };

    this.done = (a) => {
      console.log('done');
    };

    this.error = '';

    this.toggleAutoComplete = () => {
      setState({ autoComplete: !this.state.autoComplete });
    };
  }

  public render() {
    return (
      <div className="visualizeTray">

        <Expression
          functionDefinitions={this.state.functionDefinitions}
          formState={this.props.form}
          updateValue={this.props.updateValue}
          setExpression={this.props.setExpression}
          done={this.done}
          error={this.error}
          isAutocompleteEnabled={this.state.autoComplete}
          toggleAutocompleteEnabled={this.toggleAutoComplete}
        />
      </div>
    );
  }

  public componentWillMount() {
    getFunctionDefinitions({ app: { serverFunctions: [] } }).then(functionDefinitions => {
      this.setState({ functionDefinitions });
    });
  }
}

export { VisExprComponent };
