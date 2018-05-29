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

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
  EuiInMemoryTable,
} from '@elastic/eui';

export class Table extends PureComponent {
  static propTypes = {
    indexPattern: PropTypes.object.isRequired,
    items: PropTypes.array.isRequired,
    editField: PropTypes.func.isRequired,
    deleteField: PropTypes.func.isRequired,
  }

  renderFormatCell = (value) => {
    const { indexPattern } = this.props;

    const title = indexPattern.fieldFormatMap[value] && indexPattern.fieldFormatMap[value].type
      ? indexPattern.fieldFormatMap[value].type.title
      : '';

    return (
      <span>{title}</span>
    );
  }

  render() {
    const {
      items,
      editField,
      deleteField,
    } = this.props;

    const columns = [{
      field: 'displayName',
      name: 'Name',
      description: `Name of the field`,
      dataType: 'string',
      sortable: true,
      width: '38%',
    }, {
      field: 'lang',
      name: 'Lang',
      description: `Language used for the field`,
      dataType: 'string',
      sortable: true,
      'data-test-subj': 'scriptedFieldLang',
    }, {
      field: 'script',
      name: 'Script',
      description: `Script for the field`,
      dataType: 'string',
      sortable: true,
    }, {
      field: 'name',
      name: 'Format',
      description: `Format used for the field`,
      render: this.renderFormatCell,
      sortable: false,
    }, {
      name: '',
      actions: [{
        name: 'Edit',
        description: 'Edit this field',
        icon: 'pencil',
        onClick: editField,
      }, {
        name: 'Delete',
        description: 'Delete this field',
        icon: 'trash',
        color: 'danger',
        onClick: deleteField,
      }],
      width: '40px',
    }];

    const pagination = {
      initialPageSize: 10,
      pageSizeOptions: [5, 10, 25, 50],
    };

    return (
      <EuiInMemoryTable
        items={items}
        columns={columns}
        pagination={pagination}
        sorting={true}
      />
    );
  }
}
