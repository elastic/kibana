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

import chrome from 'ui/chrome';
import { setup as managementSetup } from '../../../../../../../../../management/public/legacy';
import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiSearchBar,
  EuiBasicTable,
  EuiButton,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiToolTip,
  EuiFormErrorText,
  EuiPopover,
  EuiSwitch,
  EuiFormRow,
  EuiText,
} from '@elastic/eui';
import { getDefaultTitle, getSavedObjectLabel } from '../../../../lib';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

export class Table extends PureComponent {
  static propTypes = {
    selectedSavedObjects: PropTypes.array.isRequired,
    selectionConfig: PropTypes.shape({
      selectable: PropTypes.func,
      selectableMessage: PropTypes.func,
      onSelectionChange: PropTypes.func.isRequired,
    }).isRequired,
    filterOptions: PropTypes.array.isRequired,
    canDelete: PropTypes.bool.isRequired,
    onDelete: PropTypes.func.isRequired,
    onExport: PropTypes.func.isRequired,
    goInspectObject: PropTypes.func.isRequired,

    pageIndex: PropTypes.number.isRequired,
    pageSize: PropTypes.number.isRequired,
    items: PropTypes.array.isRequired,
    itemId: PropTypes.oneOfType([
      PropTypes.string, // the name of the item id property
      PropTypes.func, // (item) => string
    ]),
    totalItemCount: PropTypes.number.isRequired,
    onQueryChange: PropTypes.func.isRequired,
    onTableChange: PropTypes.func.isRequired,
    isSearching: PropTypes.bool.isRequired,

    onShowRelationships: PropTypes.func.isRequired,
  };

  state = {
    isSearchTextValid: true,
    parseErrorMessage: null,
    isExportPopoverOpen: false,
    isIncludeReferencesDeepChecked: true,
    activeAction: null,
  };

  constructor(props) {
    super(props);
    this.extraActions = managementSetup.savedObjects.registry.get();
  }

  onChange = ({ query, error }) => {
    if (error) {
      this.setState({
        isSearchTextValid: false,
        parseErrorMessage: error.message,
      });
      return;
    }

    this.setState({
      isSearchTextValid: true,
      parseErrorMessage: null,
    });
    this.props.onQueryChange({ query });
  };

  closeExportPopover = () => {
    this.setState({ isExportPopoverOpen: false });
  };

  toggleExportPopoverVisibility = () => {
    this.setState(state => ({
      isExportPopoverOpen: !state.isExportPopoverOpen,
    }));
  };

  toggleIsIncludeReferencesDeepChecked = () => {
    this.setState(state => ({
      isIncludeReferencesDeepChecked: !state.isIncludeReferencesDeepChecked,
    }));
  };

  onExportClick = () => {
    const { onExport } = this.props;
    const { isIncludeReferencesDeepChecked } = this.state;
    onExport(isIncludeReferencesDeepChecked);
    this.setState({ isExportPopoverOpen: false });
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
      selectedSavedObjects,
      onTableChange,
      goInspectObject,
      onShowRelationships,
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
        name: i18n.translate('kbn.management.objects.objectsTable.table.typeFilterName', {
          defaultMessage: 'Type',
        }),
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
        name: i18n.translate('kbn.management.objects.objectsTable.table.columnTypeName', {
          defaultMessage: 'Type',
        }),
        width: '50px',
        align: 'center',
        description: i18n.translate(
          'kbn.management.objects.objectsTable.table.columnTypeDescription',
          { defaultMessage: 'Type of the saved object' }
        ),
        sortable: false,
        render: (type, object) => {
          return (
            <EuiToolTip position="top" content={getSavedObjectLabel(type)}>
              <EuiIcon
                aria-label={getSavedObjectLabel(type)}
                type={object.meta.icon || 'apps'}
                size="s"
              />
            </EuiToolTip>
          );
        },
      },
      {
        field: 'meta.title',
        name: i18n.translate('kbn.management.objects.objectsTable.table.columnTitleName', {
          defaultMessage: 'Title',
        }),
        description: i18n.translate(
          'kbn.management.objects.objectsTable.table.columnTitleDescription',
          { defaultMessage: 'Title of the saved object' }
        ),
        dataType: 'string',
        sortable: false,
        render: (title, object) => {
          const { path } = object.meta.inAppUrl || {};
          const canGoInApp = this.props.canGoInApp(object);
          if (!canGoInApp) {
            return <EuiText size="s">{title || getDefaultTitle(object)}</EuiText>;
          }
          return (
            <EuiLink href={chrome.addBasePath(path)}>{title || getDefaultTitle(object)}</EuiLink>
          );
        },
      },
      {
        name: i18n.translate('kbn.management.objects.objectsTable.table.columnActionsName', {
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            name: i18n.translate(
              'kbn.management.objects.objectsTable.table.columnActions.inspectActionName',
              { defaultMessage: 'Inspect' }
            ),
            description: i18n.translate(
              'kbn.management.objects.objectsTable.table.columnActions.inspectActionDescription',
              { defaultMessage: 'Inspect this saved object' }
            ),
            type: 'icon',
            icon: 'inspect',
            onClick: object => goInspectObject(object),
            available: object => !!object.meta.editUrl,
          },
          {
            name: i18n.translate(
              'kbn.management.objects.objectsTable.table.columnActions.viewRelationshipsActionName',
              { defaultMessage: 'Relationships' }
            ),
            description: i18n.translate(
              'kbn.management.objects.objectsTable.table.columnActions.viewRelationshipsActionDescription',
              {
                defaultMessage:
                  'View the relationships this saved object has to other saved objects',
              }
            ),
            type: 'icon',
            icon: 'kqlSelector',
            onClick: object => onShowRelationships(object),
          },
          ...this.extraActions.map(action => {
            return {
              ...action.euiAction,
              onClick: object => {
                this.setState({
                  activeAction: action,
                });

                action.registerOnFinishCallback(() => {
                  this.setState({
                    activeAction: null,
                  });
                });

                action.euiAction.onClick(object);
              },
            };
          }),
        ],
      },
    ];

    let queryParseError;
    if (!this.state.isSearchTextValid) {
      const parseErrorMsg = i18n.translate(
        'kbn.management.objects.objectsTable.searchBar.unableToParseQueryErrorMessage',
        { defaultMessage: 'Unable to parse query' }
      );
      queryParseError = (
        <EuiFormErrorText>{`${parseErrorMsg}. ${this.state.parseErrorMessage}`}</EuiFormErrorText>
      );
    }

    const button = (
      <EuiButton
        iconType="arrowDown"
        iconSide="right"
        onClick={this.toggleExportPopoverVisibility}
        isDisabled={selectedSavedObjects.length === 0}
      >
        <FormattedMessage
          id="kbn.management.objects.objectsTable.table.exportPopoverButtonLabel"
          defaultMessage="Export"
        />
      </EuiButton>
    );

    const activeActionContents = this.state.activeAction ? this.state.activeAction.render() : null;

    return (
      <Fragment>
        {activeActionContents}
        <EuiSearchBar
          box={{ 'data-test-subj': 'savedObjectSearchBar' }}
          filters={filters}
          onChange={this.onChange}
          toolsRight={[
            <EuiButton
              key="deleteSO"
              iconType="trash"
              color="danger"
              onClick={onDelete}
              isDisabled={selectedSavedObjects.length === 0 || !this.props.canDelete}
              title={
                this.props.canDelete
                  ? undefined
                  : i18n.translate('kbn.management.objects.objectsTable.table.deleteButtonTitle', {
                      defaultMessage: 'Unable to delete saved objects',
                    })
              }
              data-test-subj="savedObjectsManagementDelete"
            >
              <FormattedMessage
                id="kbn.management.objects.objectsTable.table.deleteButtonLabel"
                defaultMessage="Delete"
              />
            </EuiButton>,
            <EuiPopover
              key="exportSOOptions"
              button={button}
              isOpen={this.state.isExportPopoverOpen}
              closePopover={this.closeExportPopover}
            >
              <EuiFormRow
                label={
                  <FormattedMessage
                    id="kbn.management.objects.objectsTable.exportObjectsConfirmModal.exportOptionsLabel"
                    defaultMessage="Options"
                  />
                }
              >
                <EuiSwitch
                  name="includeReferencesDeep"
                  label={
                    <FormattedMessage
                      id="kbn.management.objects.objectsTable.exportObjectsConfirmModal.includeReferencesDeepLabel"
                      defaultMessage="Include related objects"
                    />
                  }
                  checked={this.state.isIncludeReferencesDeepChecked}
                  onChange={this.toggleIsIncludeReferencesDeepChecked}
                />
              </EuiFormRow>
              <EuiFormRow>
                <EuiButton key="exportSO" iconType="exportAction" onClick={this.onExportClick} fill>
                  <FormattedMessage
                    id="kbn.management.objects.objectsTable.table.exportButtonLabel"
                    defaultMessage="Export"
                  />
                </EuiButton>
              </EuiFormRow>
            </EuiPopover>,
          ]}
        />
        {queryParseError}
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
