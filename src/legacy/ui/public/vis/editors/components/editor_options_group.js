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
import PropTypes from 'prop-types';

import {
  EuiAccordion,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  htmlIdGenerator,
} from '@elastic/eui';


/**
 * A component to group different options in an editor together and give them
 * a title. Should be used for all visualize editors when grouping options,
 * to produce an aligned look and feel.
 */
function EditorOptionsGroup(props) {
  return (
    <EuiPanel
      grow={false}
      className="visEditorOptionsGroup__panel"
    >
      <EuiAccordion
        id={htmlIdGenerator('eog')()}
        initialIsOpen={!props.initialIsCollapsed}
        extraAction={props.actions}
        buttonContent={
          <EuiTitle size="xs">
            <h2>{props.title}</h2>
          </EuiTitle>
        }
      >
        <EuiSpacer size="m"/>
        { props.children }
      </EuiAccordion>
    </EuiPanel>
  );
}

EditorOptionsGroup.propTypes = {
  /**
   * The title of this options group, which will be shown with the group.
   */
  title: PropTypes.string.isRequired,
  /**
   * Add additional elements as actions to the group.
   */
  actions: PropTypes.node,
  /**
  * Whether the panel should be collapsed by default.
  */
  initialIsCollapsed: PropTypes.bool,
  /**
   * All elements that should be within this group.
   */
  children: PropTypes.node.isRequired,
};

export { EditorOptionsGroup };
