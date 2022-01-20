/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApplicationStart, IBasePath } from 'src/core/public';
import React, { PureComponent, Fragment } from 'react';
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
  EuiTableFieldDataColumnType,
  EuiTableActionsColumnType,
  QueryType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SavedObjectsTaggingApi } from '../../../../../saved_objects_tagging_oss/public';
import type { SavedObjectManagementTypeInfo } from '../../../../common/types';
import { getDefaultTitle, getSavedObjectLabel } from '../../../lib';
import { SavedObjectWithMetadata } from '../../../types';
import {
  SavedObjectsManagementActionServiceStart,
  SavedObjectsManagementAction,
  SavedObjectsManagementColumnServiceStart,
} from '../../../services';

export interface TableProps {
  taggingApi?: SavedObjectsTaggingApi;
  basePath: IBasePath;
  allowedTypes: SavedObjectManagementTypeInfo[];
  actionRegistry: SavedObjectsManagementActionServiceStart;
  columnRegistry: SavedObjectsManagementColumnServiceStart;
  selectedSavedObjects: SavedObjectWithMetadata[];
  selectionConfig: {
    onSelectionChange: (selection: SavedObjectWithMetadata[]) => void;
  };
  filterOptions: any[];
  capabilities: ApplicationStart['capabilities'];
  onDelete: () => void;
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
      filterOptions,
      selectionConfig: selection,
      capabilities,
      onDelete,
      onActionRefresh,
      selectedSavedObjects,
      onTableChange,
      goInspectObject,
      onShowRelationships,
      basePath,
      actionRegistry,
      columnRegistry,
      taggingApi,
      allowedTypes,
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
        type: 'field_value_selection',
        field: 'type',
        name: i18n.translate('savedObjectsManagement.objectsTable.table.typeFilterName', {
          defaultMessage: 'Type',
        }),
        multiSelect: 'or',
        options: filterOptions,
      },
      ...(taggingApi ? [taggingApi.ui.getSearchBarFilter({ useName: true })] : []),
    ];

    const columns = [
      {
        field: 'type',
        name: i18n.translate('savedObjectsManagement.objectsTable.table.columnTypeName', {
          defaultMessage: 'Type',
        }),
        width: '50px',
        align: 'center',
        description: i18n.translate(
          'savedObjectsManagement.objectsTable.table.columnTypeDescription',
          { defaultMessage: 'Type of the saved object' }
        ),
        sortable: false,
        'data-test-subj': 'savedObjectsTableRowType',
        render: (type: string, object: SavedObjectWithMetadata) => {
          const typeLabel = getSavedObjectLabel(type, allowedTypes);
          return (
            <EuiToolTip position="top" content={typeLabel}>
              <EuiIcon
                aria-label={typeLabel}
                type={object.meta.icon || 'apps'}
                size="s"
                data-test-subj="objectType"
              />
            </EuiToolTip>
          );
        },
      } as EuiTableFieldDataColumnType<SavedObjectWithMetadata<any>>,
      {
        field: 'meta.title',
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
        render: (title: string, object: SavedObjectWithMetadata) => {
          const { path = '' } = object.meta.inAppUrl || {};
          const canGoInApp = this.props.canGoInApp(object);
          if (!canGoInApp) {
            return <EuiText size="s">{title || getDefaultTitle(object)}</EuiText>;
          }
          return (
            <EuiLink href={basePath.prepend(path)}>{title || getDefaultTitle(object)}</EuiLink>
          );
        },
      } as EuiTableFieldDataColumnType<SavedObjectWithMetadata<any>>,
      ...(taggingApi ? [taggingApi.ui.getTableColumnDefinition()] : []),
      ...columnRegistry.getAll().map((column) => {
        return {
          ...column.euiColumn,
          sortable: false,
          'data-test-subj': `savedObjectsTableColumn-${column.id}`,
        };
      }),
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
              { defaultMessage: 'Inspect this saved object' }
            ),
            type: 'icon',
            icon: 'inspect',
            onClick: (object) => goInspectObject(object),
            'data-test-subj': 'savedObjectsTableAction-inspect',
          },
          {
            name: i18n.translate(
              'savedObjectsManagement.objectsTable.table.columnActions.viewRelationshipsActionName',
              { defaultMessage: 'Relationships' }
            ),
            description: i18n.translate(
              'savedObjectsManagement.objectsTable.table.columnActions.viewRelationshipsActionDescription',
              {
                defaultMessage:
                  'View the relationships this saved object has to other saved objects',
              }
            ),
            type: 'icon',
            icon: 'kqlSelector',
            onClick: (object) => onShowRelationships(object),
            'data-test-subj': 'savedObjectsTableAction-relationships',
          },
          ...actionRegistry.getAll().map((action) => {
            action.setActionContext({ capabilities });
            return {
              ...action.euiAction,
              'data-test-subj': `savedObjectsTableAction-${action.id}`,
              onClick: (object: SavedObjectWithMetadata) => {
                this.setState({
                  activeAction: action,
                });

                action.registerOnFinishCallback(() => {
                  this.setState({
                    activeAction: undefined,
                  });
                  const { refreshOnFinish = () => [] } = action;
                  const objectsToRefresh = refreshOnFinish();
                  onActionRefresh(objectsToRefresh);
                });

                if (action.euiAction.onClick) {
                  action.euiAction.onClick(object as any);
                }
              },
            };
          }),
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

    const button = (
      <EuiButton
        iconType="arrowDown"
        iconSide="right"
        onClick={this.toggleExportPopoverVisibility}
        isDisabled={selectedSavedObjects.length === 0}
      >
        <FormattedMessage
          id="savedObjectsManagement.objectsTable.table.exportPopoverButtonLabel"
          defaultMessage="Export"
        />
      </EuiButton>
    );

    const activeActionContents = this.state.activeAction?.render() ?? null;
    const exceededResultCount = totalItemCount > MAX_PAGINATED_ITEM;

    return (
      <Fragment>
        {activeActionContents}
        <EuiSearchBar
          box={{ 'data-test-subj': 'savedObjectSearchBar' }}
          filters={filters as any}
          onChange={this.onChange}
          defaultQuery={this.props.initialQuery}
          toolsRight={[
            <EuiButton
              key="deleteSO"
              iconType="trash"
              color="danger"
              onClick={onDelete}
              isDisabled={
                selectedSavedObjects.length === 0 || !capabilities.savedObjectsManagement.delete
              }
              title={
                capabilities.savedObjectsManagement.delete
                  ? undefined
                  : i18n.translate('savedObjectsManagement.objectsTable.table.deleteButtonTitle', {
                      defaultMessage: 'Unable to delete saved objects',
                    })
              }
              data-test-subj="savedObjectsManagementDelete"
            >
              <FormattedMessage
                id="savedObjectsManagement.objectsTable.table.deleteButtonLabel"
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
                    id="savedObjectsManagement.objectsTable.exportObjectsConfirmModal.exportOptionsLabel"
                    defaultMessage="Options"
                  />
                }
              >
                <EuiSwitch
                  name="includeReferencesDeep"
                  label={
                    <FormattedMessage
                      id="savedObjectsManagement.objectsTable.exportObjectsConfirmModal.includeReferencesDeepLabel"
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
                    id="savedObjectsManagement.objectsTable.table.exportButtonLabel"
                    defaultMessage="Export"
                  />
                </EuiButton>
              </EuiFormRow>
            </EuiPopover>,
          ]}
        />
        {queryParseError}
        <EuiSpacer size="s" />
        {exceededResultCount && (
          <>
            <EuiText color="subdued" size="s" data-test-subj="savedObjectsTableTooManyResultsLabel">
              <FormattedMessage
                id="savedObjectsManagement.objectsTable.table.tooManyResultsLabel"
                defaultMessage="Showing {limit} of {totalItemCount, plural, one {# object} other {# objects}}"
                values={{ totalItemCount, limit: MAX_PAGINATED_ITEM }}
              />
            </EuiText>
            <EuiSpacer size="s" />
          </>
        )}
        <div data-test-subj="savedObjectsTable">
          <EuiBasicTable
            loading={isSearching}
            itemId={itemId}
            items={items}
            columns={columns as any}
            pagination={pagination}
            selection={selection}
            onChange={onTableChange}
            rowProps={(item) => ({
              'data-test-subj': `savedObjectsTableRow row-${item.id}`,
            })}
          />
        </div>
      </Fragment>
    );
  }
}
