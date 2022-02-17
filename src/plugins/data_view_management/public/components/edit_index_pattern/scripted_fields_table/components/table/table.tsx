/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { PureComponent } from 'react';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { EuiInMemoryTable, EuiBasicTableColumn } from '@elastic/eui';

import { ScriptedFieldItem } from '../../types';
import { DataView } from '../../../../../../../data_views/public';

interface TableProps {
  indexPattern: DataView;
  items: ScriptedFieldItem[];
  editField: (field: ScriptedFieldItem) => void;
  deleteField: (field: ScriptedFieldItem) => void;
}

export class Table extends PureComponent<TableProps> {
  renderFormatCell = (value: string) => {
    const { indexPattern } = this.props;
    const title = get(indexPattern, ['fieldFormatMap', value, 'type', 'title'], '');

    return <span>{title}</span>;
  };

  render() {
    const { items, editField, deleteField } = this.props;

    const columns: Array<EuiBasicTableColumn<ScriptedFieldItem>> = [
      {
        field: 'displayName',
        name: i18n.translate('indexPatternManagement.editIndexPattern.scripted.table.nameHeader', {
          defaultMessage: 'Name',
        }),
        description: i18n.translate(
          'indexPatternManagement.editIndexPattern.scripted.table.nameDescription',
          { defaultMessage: 'Name of the field' }
        ),
        dataType: 'string',
        sortable: true,
        width: '38%',
      },
      {
        field: 'lang',
        name: i18n.translate('indexPatternManagement.editIndexPattern.scripted.table.langHeader', {
          defaultMessage: 'Lang',
        }),
        description: i18n.translate(
          'indexPatternManagement.editIndexPattern.scripted.table.langDescription',
          { defaultMessage: 'Language used for the field' }
        ),
        dataType: 'string',
        sortable: true,
        'data-test-subj': 'scriptedFieldLang',
      },
      {
        field: 'script',
        name: i18n.translate(
          'indexPatternManagement.editIndexPattern.scripted.table.scriptHeader',
          {
            defaultMessage: 'Script',
          }
        ),
        description: i18n.translate(
          'indexPatternManagement.editIndexPattern.scripted.table.scriptDescription',
          { defaultMessage: 'Script for the field' }
        ),
        dataType: 'string',
        sortable: true,
      },
      {
        field: 'name',
        name: i18n.translate(
          'indexPatternManagement.editIndexPattern.scripted.table.formatHeader',
          {
            defaultMessage: 'Format',
          }
        ),
        description: i18n.translate(
          'indexPatternManagement.editIndexPattern.scripted.table.formatDescription',
          { defaultMessage: 'Format used for the field' }
        ),
        render: this.renderFormatCell,
        sortable: false,
      },
      {
        name: '',
        actions: [
          {
            type: 'icon',
            name: i18n.translate(
              'indexPatternManagement.editIndexPattern.scripted.table.editHeader',
              {
                defaultMessage: 'Edit',
              }
            ),
            description: i18n.translate(
              'indexPatternManagement.editIndexPattern.scripted.table.editDescription',
              { defaultMessage: 'Edit this field' }
            ),
            icon: 'pencil',
            onClick: editField,
            available: (field) => !!field.isUserEditable,
          },
          {
            type: 'icon',
            name: i18n.translate(
              'indexPatternManagement.editIndexPattern.scripted.table.deleteHeader',
              {
                defaultMessage: 'Delete',
              }
            ),
            description: i18n.translate(
              'indexPatternManagement.editIndexPattern.scripted.table.deleteDescription',
              { defaultMessage: 'Delete this field' }
            ),
            icon: 'trash',
            color: 'danger',
            onClick: deleteField,
            available: (field) => !!field.isUserEditable,
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
