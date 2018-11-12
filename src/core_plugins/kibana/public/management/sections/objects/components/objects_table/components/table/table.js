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

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiSearchBar,
  EuiBasicTable,
  EuiButton,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiToolTip
} from '@elastic/eui';
import { getSavedObjectLabel, getSavedObjectIcon } from '../../../../lib';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

class TableUI extends PureComponent {
  static propTypes = {
    selectedSavedObjects: PropTypes.array.isRequired,
    selectionConfig: PropTypes.shape({
      selectable: PropTypes.func,
      selectableMessage: PropTypes.func,
      onSelectionChange: PropTypes.func.isRequired,
    }).isRequired,
    filterOptions: PropTypes.array.isRequired,
    onDelete: PropTypes.func.isRequired,
    onExport: PropTypes.func.isRequired,
    getEditUrl: PropTypes.func.isRequired,
    goInApp: PropTypes.func.isRequired,

    pageIndex: PropTypes.number.isRequired,
    pageSize: PropTypes.number.isRequired,
    items: PropTypes.array.isRequired,
    itemId: PropTypes.oneOfType([
      PropTypes.string, // the name of the item id property
      PropTypes.func    // (item) => string
    ]),
    totalItemCount: PropTypes.number.isRequired,
    onQueryChange: PropTypes.func.isRequired,
    onTableChange: PropTypes.func.isRequired,
    isSearching: PropTypes.bool.isRequired,

    onShowRelationships: PropTypes.func.isRequired,
  };

  render() {
    const {
      pageIndex,
      pageSize,
      itemId,
      items,
      totalItemCount,
      isSearching,
      filterOptions,
      selectionConfig: selection,
      onDelete,
      onExport,
      selectedSavedObjects,
      onQueryChange,
      onTableChange,
      goInApp,
      getEditUrl,
      onShowRelationships,
      intl,
    } = this.props;

    const pagination = {
      pageIndex: pageIndex,
      pageSize: pageSize,
      totalItemCount: totalItemCount,
      pageSizeOptions: [5, 10, 20, 50],
    };

    const filters = [
      {
        type: 'field_value_selection',
        field: 'type',
        name: intl.formatMessage({ id: 'kbn.management.objects.objectsTable.table.typeFilterName', defaultMessage: 'Type' }),
        multiSelect: 'or',
        options: filterOptions,
      },
      // Add this back in once we have tag support
      // {
      //   type: 'field_value_selection',
      //   field: 'tag',
      //   name: 'Tags',
      //   multiSelect: 'or',
      //   options: [],
      // },
    ];

    const columns = [
      {
        field: 'type',
        name: intl.formatMessage({ id: 'kbn.management.objects.objectsTable.table.columnTypeName', defaultMessage: 'Type' }),
        width: '50px',
        align: 'center',
        description:
          intl.formatMessage({
            id: 'kbn.management.objects.objectsTable.table.columnTypeDescription', defaultMessage: 'Type of the saved object'
          }),
        sortable: false,
        render: type => {
          return (
            <EuiToolTip
              position="top"
              content={getSavedObjectLabel(type)}
            >
              <EuiIcon
                aria-label={getSavedObjectLabel(type)}
                type={getSavedObjectIcon(type)}
                size="s"
              />
            </EuiToolTip>
          );
        },
      },
      {
        field: 'title',
        name: intl.formatMessage({ id: 'kbn.management.objects.objectsTable.table.columnTitleName', defaultMessage: 'Title' }),
        description:
        intl.formatMessage({
          id: 'kbn.management.objects.objectsTable.table.columnTitleDescription', defaultMessage: 'Title of the saved object'
        }),
        dataType: 'string',
        sortable: false,
        render: (title, object) => (
          <EuiLink href={getEditUrl(object.id, object.type)}>{title}</EuiLink>
        ),
      },
      {
        name: intl.formatMessage({ id: 'kbn.management.objects.objectsTable.table.columnActionsName', defaultMessage: 'Actions' }),
        actions: [
          {
            name: intl.formatMessage({
              id: 'kbn.management.objects.objectsTable.table.columnActions.viewInAppActionName', defaultMessage: 'In app'
            }),
            description:
              intl.formatMessage({
                id: 'kbn.management.objects.objectsTable.table.columnActions.viewInAppActionDescription',
                defaultMessage: 'View this saved object within Kibana'
              }),
            type: 'icon',
            icon: 'eye',
            onClick: object => goInApp(object.id, object.type),
          },
          {
            name:
              intl.formatMessage({
                id: 'kbn.management.objects.objectsTable.table.columnActions.viewRelationshipsActionName',
                defaultMessage: 'Relationships'
              }),
            description:
              intl.formatMessage({
                id: 'kbn.management.objects.objectsTable.table.columnActions.viewRelationshipsActionDescription',
                defaultMessage: 'View the relationships this saved object has to other saved objects'
              }),
            type: 'icon',
            icon: 'kqlSelector',
            onClick: object =>
              onShowRelationships(object.id, object.type, object.title),
          },
        ],
      },
    ];

    return (
      <Fragment>
        <EuiSearchBar
          filters={filters}
          onChange={onQueryChange}
          toolsRight={[
            <EuiButton
              key="deleteSO"
              iconType="trash"
              color="danger"
              onClick={onDelete}
              isDisabled={selectedSavedObjects.length === 0}
            >
              <FormattedMessage
                id="kbn.management.objects.objectsTable.table.deleteButtonLabel"
                defaultMessage="Delete"
              />
            </EuiButton>,
            <EuiButton
              key="exportSO"
              iconType="exportAction"
              onClick={onExport}
              isDisabled={selectedSavedObjects.length === 0}
            >
              <FormattedMessage
                id="kbn.management.objects.objectsTable.table.exportButtonLabel"
                defaultMessage="Export"
              />
            </EuiButton>,
          ]}
        />
        <EuiSpacer size="s" />
        <div data-test-subj="savedObjectsTable">
          <EuiBasicTable
            loading={isSearching}
            itemId={itemId}
            items={items}
            columns={columns}
            pagination={pagination}
            selection={selection}
            onChange={onTableChange}
          />
        </div>
      </Fragment>
    );
  }
}

export const Table = injectI18n(TableUI);
