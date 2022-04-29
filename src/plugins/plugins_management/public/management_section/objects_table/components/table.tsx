/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApplicationStart, IBasePath } from '@kbn/core/public';
import React, { PureComponent, Fragment } from 'react';
import {
  EuiSearchBar,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiToolTip,
  EuiFormErrorText,
  EuiText,
  EuiTableFieldDataColumnType,
  EuiTableActionsColumnType,
  QueryType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { getDefaultTitle } from '../../../lib';
import { SavedObjectWithMetadata } from '../../../types';
import {
  SavedObjectsManagementActionServiceStart,
  SavedObjectsManagementAction,
  SavedObjectsManagementColumnServiceStart,
} from '../../../services';

export interface TableProps {
  taggingApi?: SavedObjectsTaggingApi;
  basePath: IBasePath;
  actionRegistry: SavedObjectsManagementActionServiceStart;
  columnRegistry: SavedObjectsManagementColumnServiceStart;
  selectedSavedObjects: SavedObjectWithMetadata[];
  selectionConfig: {
    onSelectionChange: (selection: SavedObjectWithMetadata[]) => void;
  };
  capabilities: ApplicationStart['capabilities'];
  onActionRefresh: (objects: Array<{ type: string; id: string }>) => void;
  onExport: (includeReferencesDeep: boolean) => void;
  goInspectObject: (obj: SavedObjectWithMetadata) => void;
  pageIndex: number;
  pageSize: number;
  items: SavedObjectWithMetadata[];
  itemId: string | (() => string);
  totalItemCount: number;
  onQueryChange: (query: any) => void;
  onTableChange: (table: any) => void;
  isSearching: boolean;
  onShowRelationships: (object: SavedObjectWithMetadata) => void;
  canGoInApp: (obj: SavedObjectWithMetadata) => boolean;
  initialQuery?: QueryType;
  onUpgrade: (id: string) => void;
  upgradeInProgressForId?: string;
}

interface TableState {
  isSearchTextValid: boolean;
  parseErrorMessage: any;
  isExportPopoverOpen: boolean;
  isIncludeReferencesDeepChecked: boolean;
  activeAction?: SavedObjectsManagementAction;
}

const MAX_PAGINATED_ITEM = 10000;

export class Table extends PureComponent<TableProps, TableState> {
  state: TableState = {
    isSearchTextValid: true,
    parseErrorMessage: null,
    isExportPopoverOpen: false,
    isIncludeReferencesDeepChecked: true,
    activeAction: undefined,
  };

  constructor(props: TableProps) {
    super(props);
  }

  onChange = ({ query, error }: any) => {
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
    this.setState((state) => ({
      isExportPopoverOpen: !state.isExportPopoverOpen,
    }));
  };

  toggleIsIncludeReferencesDeepChecked = () => {
    this.setState((state) => ({
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
      selectionConfig: selection,
      capabilities,
      onActionRefresh,
      onTableChange,
      goInspectObject,
      onUpgrade,
      upgradeInProgressForId,
      basePath,
      columnRegistry,
      taggingApi,
    } = this.props;

    const cappedTotalItemCount = Math.min(totalItemCount, MAX_PAGINATED_ITEM);

    const pagination = {
      pageIndex,
      pageSize,
      totalItemCount: cappedTotalItemCount,
      pageSizeOptions: [5, 10, 20, 50],
    };

    const filters = [
      {
        type: 'field_value_toggle_group',
        field: 'source',
        name: i18n.translate('savedObjectsManagement.objectsTable.table.typeFilterName', {
          defaultMessage: 'Source',
        }),
        multiSelect: 'or',
        items: [
          {
            value: 'verified',
            name: 'Verified',
          },
          {
            value: 'external',
            name: 'Third Party',
          },
        ],
      },
    ];

    const columns = [
      {
        field: 'source',
        name: i18n.translate('pluginssManagement.objectsTable.table.columnSourceName', {
          defaultMessage: 'Source',
        }),
        width: '90px',
        align: 'center',
        description: i18n.translate(
          'pluginssManagement.objectsTable.table.columnSourceDescription',
          { defaultMessage: 'Type of the saved object' }
        ),
        sortable: false,
        'data-test-subj': 'savedObjectsTableRowType',
        render: (source: string, object: SavedObjectWithMetadata) => {
          const iconType = source === 'external' ? 'folderExclamation' : 'folderCheck';
          const sourceLabel = source === 'external' ? 'External' : 'Verified';

          return (
            <EuiToolTip position="top" content={sourceLabel}>
              <EuiIcon
                aria-label={sourceLabel}
                type={iconType}
                size="m"
                data-test-subj="pluginSource"
              />
            </EuiToolTip>
          );
        },
      } as EuiTableFieldDataColumnType<SavedObjectWithMetadata<any>>,
      {
        field: 'pluginName',
        name: i18n.translate('savedObjectsManagement.objectsTable.table.columnTitleName', {
          defaultMessage: 'Title',
        }),
        description: i18n.translate(
          'savedObjectsManagement.objectsTable.table.columnTitleDescription',
          { defaultMessage: 'Title of the saved object' }
        ),
        dataType: 'string',
        sortable: false,
        'data-test-subj': 'savedObjectsTableRowTitle',
      } as EuiTableFieldDataColumnType<SavedObjectWithMetadata<any>>,
      {
        name: i18n.translate('savedObjectsManagement.objectsTable.table.columnActionsName', {
          defaultMessage: 'Actions',
        }),
        width: '80px',
        actions: [
          {
            name: i18n.translate(
              'savedObjectsManagement.objectsTable.table.columnActions.inspectActionName',
              { defaultMessage: 'Inspect' }
            ),
            description: i18n.translate(
              'savedObjectsManagement.objectsTable.table.columnActions.inspectActionDescription',
              { defaultMessage: 'Inspect this plugin' }
            ),
            type: 'icon',
            icon: 'inspect',
            onClick: (object) => goInspectObject(object),
            'data-test-subj': 'savedObjectsTableAction-inspect',
          },
          {
            name: i18n.translate(
              'savedObjectsManagement.objectsTable.table.columnActions.updateActionName',
              { defaultMessage: 'Upgrade' }
            ),
            render: (plugin) => {
              const isLoading = plugin.pluginName === upgradeInProgressForId;
              return (
                <EuiToolTip
                  position="top"
                  content={i18n.translate(
                    'savedObjectsManagement.objectsTable.table.columnActions.updateActionDescription',
                    { defaultMessage: 'Upgrade this plugin' }
                  )}
                >
                  <EuiButtonEmpty
                    disabled={isLoading || !(plugin as any).upgradeAvailable}
                    iconType="sortUp"
                    size="s"
                    isLoading={isLoading}
                    onClick={() => onUpgrade(plugin.pluginName)}
                    data-test-subj="pluginSource"
                  >
                    Upgrade
                  </EuiButtonEmpty>
                </EuiToolTip>
              );
            },
          },
        ],
      } as EuiTableActionsColumnType<SavedObjectWithMetadata>,
    ];

    let queryParseError;
    if (!this.state.isSearchTextValid) {
      const parseErrorMsg = i18n.translate(
        'savedObjectsManagement.objectsTable.searchBar.unableToParseQueryErrorMessage',
        { defaultMessage: 'Unable to parse query' }
      );
      queryParseError = (
        <EuiFormErrorText>{`${parseErrorMsg}. ${this.state.parseErrorMessage}`}</EuiFormErrorText>
      );
    }

    const activeActionContents = this.state.activeAction?.render() ?? null;
    const exceededResultCount = totalItemCount > MAX_PAGINATED_ITEM;

    return (
      <Fragment>
        {activeActionContents}
        <EuiSearchBar
          box={{ 'data-test-subj': 'pluginsManagementSearchBar' }}
          filters={filters as any}
          onChange={this.onChange}
          defaultQuery={this.props.initialQuery}
          toolsRight={[
            <EuiButton
              key="uninstallPlugin"
              iconType="unlink"
              color="danger"
              onClick={() => {}}
              isDisabled={true}
              title={
                capabilities.pluginsManagement.delete
                  ? undefined
                  : i18n.translate('pluginsManagement.objectsTable.table.deleteButtonTitle', {
                      defaultMessage: 'Unable to uninstall plugins',
                    })
              }
            >
              <FormattedMessage
                id="pluginsManagement.objectsTable.table.deleteButtonLabel"
                defaultMessage="Uninstall"
              />
            </EuiButton>,
          ]}
        />
        {queryParseError}
        <EuiSpacer size="s" />
        {exceededResultCount && (
          <>
            <EuiText color="subdued" size="s" data-test-subj="pluginsTableTooManyResultsLabel">
              <FormattedMessage
                id="savedObjectsManagement.objectsTable.table.tooManyResultsLabel"
                defaultMessage="Showing {limit} of {totalItemCount, plural, one {# object} other {# objects}}"
                values={{ totalItemCount, limit: MAX_PAGINATED_ITEM }}
              />
            </EuiText>
            <EuiSpacer size="s" />
          </>
        )}
        <div>
          <EuiBasicTable
            loading={isSearching}
            itemId={itemId}
            items={items}
            columns={columns as any}
            pagination={pagination}
            selection={selection}
            onChange={onTableChange}
          />
        </div>
      </Fragment>
    );
  }
}
