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

import _ from 'lodash';

import { KuiTableRow, KuiTableRowCell, KuiTableRowCheckBoxCell } from '../';

import { LEFT_ALIGNMENT, RIGHT_ALIGNMENT } from '../../../services';

export class KuiListingTableRow extends React.PureComponent {
  onSelectionChanged = () => {
    this.props.onSelectionChanged(this.props.row.id);
  };

  renderCells() {
    return this.props.row.cells.map((cell, index) => {
      let { content, ...props } = cell;
      if (React.isValidElement(cell) || !_.isObject(cell)) {
        props = [];
        content = cell;
      }
      return (
        <KuiTableRowCell key={index} {...props}>
          {content}
        </KuiTableRowCell>
      );
    });
  }

  render() {
    const { enableSelection, isSelected } = this.props;
    return (
      <KuiTableRow>
        {enableSelection && (
          <KuiTableRowCheckBoxCell isChecked={isSelected} onChange={this.onSelectionChanged} />
        )}
        {this.renderCells()}
      </KuiTableRow>
    );
  }
}

KuiListingTableRow.propTypes = {
  row: PropTypes.shape({
    id: PropTypes.string,
    cells: PropTypes.arrayOf(
      PropTypes.oneOfType([
        PropTypes.node,
        PropTypes.shape({
          content: PropTypes.node,
          align: PropTypes.oneOf([LEFT_ALIGNMENT, RIGHT_ALIGNMENT]),
        }),
      ])
    ),
  }).isRequired,
  enableSelection: PropTypes.bool,
  onSelectionChanged: PropTypes.func.isRequired,
  isSelected: PropTypes.bool,
};

KuiListingTableRow.defaultProps = {
  enableSelection: true,
};
