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

import { EuiInMemoryTable } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

export class Table extends PureComponent {
  static propTypes = {
    indexPattern: PropTypes.object.isRequired,
    items: PropTypes.array.isRequired,
    editField: PropTypes.func.isRequired,
    deleteField: PropTypes.func.isRequired,
  };

  renderFormatCell = value => {
    const { indexPattern } = this.props;

    const title =
      indexPattern.fieldFormatMap[value] && indexPattern.fieldFormatMap[value].type
        ? indexPattern.fieldFormatMap[value].type.title
        : '';

    return <span>{title}</span>;
  };

  render() {
    const { items, editField, deleteField } = this.props;

    const columns = [
      {
        field: 'displayName',
        name: i18n.translate('kbn.management.editIndexPattern.scripted.table.nameHeader', {
          defaultMessage: 'Name',
        }),
        description: i18n.translate(
          'kbn.management.editIndexPattern.scripted.table.nameDescription',
          { defaultMessage: 'Name of the field' }
        ),
        dataType: 'string',
        sortable: true,
        width: '38%',
      },
      {
        field: 'lang',
        name: i18n.translate('kbn.management.editIndexPattern.scripted.table.langHeader', {
          defaultMessage: 'Lang',
        }),
        description: i18n.translate(
          'kbn.management.editIndexPattern.scripted.table.langDescription',
          { defaultMessage: 'Language used for the field' }
        ),
        dataType: 'string',
        sortable: true,
        'data-test-subj': 'scriptedFieldLang',
      },
      {
        field: 'script',
        name: i18n.translate('kbn.management.editIndexPattern.scripted.table.scriptHeader', {
          defaultMessage: 'Script',
        }),
        description: i18n.translate(
          'kbn.management.editIndexPattern.scripted.table.scriptDescription',
          { defaultMessage: 'Script for the field' }
        ),
        dataType: 'string',
        sortable: true,
      },
      {
        field: 'name',
        name: i18n.translate('kbn.management.editIndexPattern.scripted.table.formatHeader', {
          defaultMessage: 'Format',
        }),
        description: i18n.translate(
          'kbn.management.editIndexPattern.scripted.table.formatDescription',
          { defaultMessage: 'Format used for the field' }
        ),
        render: this.renderFormatCell,
        sortable: false,
      },
      {
        name: '',
        actions: [
          {
            name: i18n.translate('kbn.management.editIndexPattern.scripted.table.editHeader', {
              defaultMessage: 'Edit',
            }),
            description: i18n.translate(
              'kbn.management.editIndexPattern.scripted.table.editDescription',
              { defaultMessage: 'Edit this field' }
            ),
            icon: 'pencil',
            onClick: editField,
          },
          {
            name: i18n.translate('kbn.management.editIndexPattern.scripted.table.deleteHeader', {
              defaultMessage: 'Delete',
            }),
            description: i18n.translate(
              'kbn.management.editIndexPattern.scripted.table.deleteDescription',
              { defaultMessage: 'Delete this field' }
            ),
            icon: 'trash',
            color: 'danger',
            onClick: deleteField,
          },
        ],
        width: '40px',
      },
    ];

    const pagination = {
      initialPageSize: 10,
      pageSizeOptions: [5, 10, 25, 50],
    };

    return (
      <EuiInMemoryTable items={items} columns={columns} pagination={pagination} sorting={true} />
    );
  }
}
