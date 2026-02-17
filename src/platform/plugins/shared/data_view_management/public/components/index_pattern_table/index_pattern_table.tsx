/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiIconTip,
  EuiInMemoryTable,
  EuiLink,
  EuiLoadingSpinner,
  EuiPageHeader,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import React, { useMemo, useState } from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { withRouter } from 'react-router-dom';
import useObservable from 'react-use/lib/useObservable';

import type { SavedObjectRelation } from '@kbn/saved-objects-management-plugin/common';
import { reactRouterNavigate, useKibana } from '@kbn/kibana-react-plugin/public';
import { NoDataViewsPromptComponent, useOnTryESQL } from '@kbn/shared-ux-prompt-no-data-views';
import type { SpacesContextProps } from '@kbn/spaces-plugin/public';
import {
  DATA_VIEW_SAVED_OBJECT_TYPE,
  DataViewType,
  type DataView,
} from '@kbn/data-views-plugin/public';
import { RollupDeprecationTooltip } from '@kbn/rollup';
import { useEuiTablePersist } from '@kbn/shared-ux-table-persist';

import type { IndexPatternManagmentContext } from '../../types';
import { getListBreadcrumbs } from '../breadcrumbs';
import { type RemoveDataViewProps } from '../edit_index_pattern';
import type { IndexPatternTableItem } from '../types';
import {
  DataViewTableController,
  dataViewTableControllerStateDefaults as defaults,
} from './data_view_table_controller';
import { NoData } from './no_data';
import { SpacesList } from './spaces_list';
import { MAX_DISPLAYED_RELATIONSHIPS } from '../../constants';
import { DeleteDataViewFlyout } from '../delete_data_view_flyout/delete_data_view_flyout';

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

const sorting = {
  sort: {
    field: 'title',
    direction: 'asc' as const,
  },
};

const securityDataView = i18n.translate(
  'indexPatternManagement.indexPatternTable.badge.securityDataViewTitle',
  {
    defaultMessage: 'Security Solution',
  }
);

const securitySolution = 'security-solution';

interface Props extends RouteComponentProps {
  canSave: boolean;
  setShowCreateDialog: React.Dispatch<React.SetStateAction<boolean>>;
  title: string;
}

const getEmptyFunctionComponent: React.FC<SpacesContextProps> = ({ children }) => <>{children}</>;

export const IndexPatternTable = ({ history, canSave, setShowCreateDialog, title }: Props) => {
  const {
    setBreadcrumbs,
    http,
    uiSettings,
    application,
    chrome,
    dataViews,
    share,
    spaces,
    docLinks,
    noDataPage,
    IndexPatternEditor,
    savedObjectsManagement,
  } = useKibana<IndexPatternManagmentContext>().services;

  const [query, setQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<RemoveDataViewProps[]>([]);
  const [selectedDataView, setSelectedDataView] = useState<RemoveDataViewProps>();
  const [editDataView, setEditDataView] = useState<DataView>();
  const [selectedRelationships, setSelectedRelationships] = useState<
    Record<string, SavedObjectRelation[]>
  >({});
  const [deleteFlyoutOpen, setDeleteFlyoutOpen] = useState(false);
  const [dataViewController] = useState(
    () =>
      new DataViewTableController({
        services: { dataViews },
        config: { defaultDataView: uiSettings.get('defaultIndex') },
      })
  );

  const isLoadingIndexPatterns = useObservable(
    dataViewController.isLoadingIndexPatterns$,
    defaults.isLoadingDataViews
  );
  const indexPatterns = useObservable(dataViewController.indexPatterns$, defaults.dataViews);
  const isLoadingDataState = useObservable(
    dataViewController.isLoadingDataState$,
    defaults.isLoadingHasData
  );
  const hasDataView = useObservable(dataViewController.hasDataView$, defaults.hasDataView);
  const hasESData = useObservable(dataViewController.hasESData$, defaults.hasEsData);

  const useOnTryESQLParams = {
    locatorClient: share?.url.locators,
    navigateToApp: application.navigateToApp,
  };
  const onTryESQL = useOnTryESQL(useOnTryESQLParams);

  const { pageSize, onTableChange } = useEuiTablePersist<IndexPatternTableItem>({
    tableId: 'dataViewsIndexPattern',
    initialPageSize: 10,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  });

  const handleOnChange = ({ queryText, error }: { queryText: string; error: unknown }) => {
    if (!error) {
      setQuery(queryText);
    }
  };

  const onDeleteFlyoutClose = () => {
    setDeleteFlyoutOpen(false);
    setSelectedItems([]);
    setSelectedDataView(undefined);
    setSelectedRelationships({});
  };

  const onEditFlyoutClose = () => {
    setEditDataView(undefined);
  };

  const dataViewArray = useMemo(() => {
    return selectedDataView ? [selectedDataView] : selectedItems;
  }, [selectedDataView, selectedItems]);

  const getRelationshipsForSelections = async (selectedViews: RemoveDataViewProps[]) => {
    const allowedTypes = (await savedObjectsManagement.getAllowedTypes()).map((type) => type.name);

    const relationships: Record<string, unknown> = {};

    const relationshipsArray = await Promise.all(
      selectedViews.map(async (view) => ({
        id: view.id,
        relations: await (
          await savedObjectsManagement.getRelationships(
            DATA_VIEW_SAVED_OBJECT_TYPE,
            view.id,
            allowedTypes,
            MAX_DISPLAYED_RELATIONSHIPS
          )
        ).relations,
      }))
    );

    // Reduce the array to a relationships object keyed by id
    relationshipsArray.forEach(({ id, relations }) => {
      relationships[id] = relations;
    });

    return relationships;
  };

  const renderDeleteButton = () => {
    if (selectedItems.length === 0) {
      return;
    }
    return (
      <EuiButton
        color="danger"
        iconType="trash"
        data-test-subj="delete-data-views-button"
        onClick={async () => {
          const relationships =
            ((await getRelationshipsForSelections(selectedItems)) as Record<
              string,
              SavedObjectRelation[]
            >) || {};
          setSelectedRelationships(relationships);
          setDeleteFlyoutOpen(true);
        }}
      >
        <FormattedMessage
          id="indexPatternManagement.dataViewTable.deleteButtonLabel"
          defaultMessage="Delete {selectedItems, number} {selectedItems, plural,
            one {Data View}
            other {Data Views}
}"
          values={{ selectedItems: selectedItems.length }}
        />
      </EuiButton>
    );
  };

  const deleteButton = renderDeleteButton();

  const search = {
    toolsLeft: deleteButton && [deleteButton],
    query,
    onChange: handleOnChange,
    box: {
      incremental: true,
      schema: {
        fields: { title: { type: 'string' } },
      },
    },
  };

  setBreadcrumbs(getListBreadcrumbs());

  chrome.docTitle.change(title);

  const ContextWrapper = useMemo(
    () => (spaces ? spaces.ui.components.getSpacesContextProvider : getEmptyFunctionComponent),
    [spaces]
  );

  const alertColumn = {
    name: 'Actions',
    field: 'id',
    width: '10%',
    actions: [
      {
        name: i18n.translate('indexPatternManagement.dataViewTable.columnEdit', {
          defaultMessage: 'Edit',
        }),
        description: i18n.translate('indexPatternManagement.dataViewTable.columnEditDescription', {
          defaultMessage: 'Edit this data view',
        }),
        icon: 'pencil',
        color: 'primary',
        type: 'icon',
        onClick: async (dataView: RemoveDataViewProps) => {
          const fullDataView = await dataViews.get(dataView.id);
          setEditDataView(fullDataView);
        },
        'data-test-subj': 'action-edit',
      },
      {
        name: i18n.translate('indexPatternManagement.dataViewTable.columnDelete', {
          defaultMessage: 'Delete',
        }),
        description: i18n.translate(
          'indexPatternManagement.dataViewTable.columnDeleteDescription',
          {
            defaultMessage: 'Delete this data view',
          }
        ),
        icon: 'trash',
        color: 'danger',
        type: 'icon',
        onClick: async (dataView: RemoveDataViewProps) => {
          const relationships = (await getRelationshipsForSelections([dataView])) as Record<
            string,
            SavedObjectRelation[]
          >;
          setSelectedDataView(dataView);
          setSelectedRelationships(relationships);
          setDeleteFlyoutOpen(true);
        },
        isPrimary: true,
        'data-test-subj': 'action-delete',
      },
    ],
  };

  const columns: Array<EuiBasicTableColumn<IndexPatternTableItem>> = [
    {
      field: 'title',
      name: i18n.translate('indexPatternManagement.dataViewTable.nameColumn', {
        defaultMessage: 'Name',
      }),
      width: spaces ? '70%' : '90%',
      render: (_name: string, dataView: IndexPatternTableItem) => (
        <div>
          <EuiLink
            {...reactRouterNavigate(history, `patterns/${dataView.id}`)}
            data-test-subj={`detail-link-${dataView.getName()}`}
          >
            {dataView.getName()}
            {dataView.name ? (
              <>
                &nbsp;
                <EuiIconTip
                  type="info"
                  color="text"
                  aria-label={dataView.title}
                  content={dataView.title}
                />
              </>
            ) : null}
          </EuiLink>
          {dataView?.id?.indexOf(securitySolution) === 0 && (
            <>
              &emsp;<EuiBadge color="accent">{securityDataView}</EuiBadge>
            </>
          )}
          {dataView?.tags?.map(({ key: tagKey, name: tagName }) => (
            <span key={tagKey}>
              &emsp;
              {tagKey === DataViewType.ROLLUP ? (
                <RollupDeprecationTooltip>
                  <EuiBadge color="warning">{tagName}</EuiBadge>
                </RollupDeprecationTooltip>
              ) : (
                <EuiBadge>{tagName}</EuiBadge>
              )}
            </span>
          ))}
        </div>
      ),
      dataType: 'string' as const,
      sortable: ({ sort }: { sort: string }) => sort,
    },
  ];

  if (spaces) {
    columns.push({
      field: 'namespaces',
      name: i18n.translate('indexPatternManagement.dataViewTable.spacesColumn', {
        defaultMessage: 'Spaces',
      }),
      width: '20%',
      render: (_name: string, dataView: IndexPatternTableItem) => {
        return spaces ? (
          <SpacesList
            spacesApi={spaces}
            capabilities={application?.capabilities}
            spaceIds={dataView.namespaces || []}
            id={dataView.id}
            title={dataView.title}
            refresh={() => {
              dataViews.clearInstanceCache(dataView.id);
              dataViewController.loadDataViews();
            }}
          />
        ) : (
          <></>
        );
      },
    });
  }

  if (dataViews.getCanSaveSync()) {
    columns.push(alertColumn);
  }

  const createButton = canSave ? (
    <EuiButton
      fill={true}
      iconType="plusInCircle"
      onClick={() => setShowCreateDialog(true)}
      data-test-subj="createDataViewButton"
    >
      <FormattedMessage
        id="indexPatternManagement.dataViewTable.createBtn"
        defaultMessage="Create data view"
      />
    </EuiButton>
  ) : (
    <></>
  );

  if (isLoadingIndexPatterns) {
    return <></>;
  }

  const selection = {
    onSelectionChange: setSelectedItems,
  };

  let displayIndexPatternSection = (
    <>
      <EuiPageHeader
        pageTitle={title}
        description={
          <FormattedMessage
            id="indexPatternManagement.dataViewTable.indexPatternExplanation"
            defaultMessage="Create and manage the data views that help you retrieve your data from Elasticsearch."
          />
        }
        bottomBorder
        rightSideItems={[createButton]}
      />

      <EuiSpacer size="l" />
      <ContextWrapper>
        <EuiInMemoryTable
          allowNeutralSort={false}
          itemId="id"
          items={indexPatterns}
          columns={columns}
          pagination={{
            pageSize,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
          }}
          sorting={sorting}
          onTableChange={onTableChange}
          search={search}
          selection={dataViews.getCanSaveSync() ? selection : undefined}
          tableCaption={title}
        />
      </ContextWrapper>
      {deleteFlyoutOpen && (
        <DeleteDataViewFlyout
          dataViews={dataViews}
          dataViewArray={dataViewArray}
          selectedRelationships={selectedRelationships}
          hasSpaces={!!spaces}
          onDelete={async () => {
            dataViewController.loadDataViews();
            onDeleteFlyoutClose();
          }}
          onClose={onDeleteFlyoutClose}
        />
      )}
      {!!editDataView && (
        <IndexPatternEditor
          onSave={() => {
            dataViewController.loadDataViews();
            onEditFlyoutClose();
          }}
          onCancel={onEditFlyoutClose}
          editData={editDataView}
        />
      )}
    </>
  );
  if (!hasDataView)
    displayIndexPatternSection = (
      <>
        <EuiSpacer size="xxl" />
        <NoDataViewsPromptComponent
          onClickCreate={() => setShowCreateDialog(true)}
          canCreateNewDataView={application.capabilities.indexPatterns.save as boolean}
          dataViewsDocLink={docLinks.links.indexPatterns.introduction}
          onTryESQL={onTryESQL}
          esqlDocLink={docLinks.links.query.queryESQL}
          emptyPromptColor={'subdued'}
        />
      </>
    );
  if (!hasDataView && !hasESData)
    displayIndexPatternSection = (
      <>
        <EuiSpacer size="xxl" />
        <NoData
          noDataPage={noDataPage}
          docLinks={docLinks}
          uiSettings={uiSettings}
          http={http}
          application={application}
          dataViewController={dataViewController}
          setShowCreateDialog={setShowCreateDialog}
        />
      </>
    );

  return (
    <>
      {isLoadingDataState ? (
        <div css={{ display: 'flex', justifyContent: 'center' }}>
          <EuiLoadingSpinner size="xxl" />
        </div>
      ) : (
        displayIndexPatternSection
      )}
    </>
  );
};

export const IndexPatternTableWithRouter = withRouter(IndexPatternTable);
