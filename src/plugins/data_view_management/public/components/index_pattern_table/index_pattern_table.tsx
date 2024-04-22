/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiBadge,
  EuiBasicTableColumn,
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
import { RouteComponentProps, useLocation, withRouter } from 'react-router-dom';
import useObservable from 'react-use/lib/useObservable';

import { reactRouterNavigate, useKibana } from '@kbn/kibana-react-plugin/public';
import { NoDataViewsPromptComponent } from '@kbn/shared-ux-prompt-no-data-views';
import type { SpacesContextProps } from '@kbn/spaces-plugin/public';
import { DataViewType } from '@kbn/data-views-plugin/public';
import type { IndexPatternManagmentContext } from '../../types';
import { getListBreadcrumbs } from '../breadcrumbs';
import { type RemoveDataViewProps, removeDataView } from '../edit_index_pattern';
import { IndexPatternTableItem } from '../types';
import {
  DataViewTableController,
  dataViewTableControllerStateDefaults as defaults,
} from './data_view_table_controller';
import { deleteModalMsg } from './delete_modal_msg';
import { NoData } from './no_data';
import { SpacesList } from './spaces_list';

const pagination = {
  initialPageSize: 10,
  pageSizeOptions: [5, 10, 25, 50],
};

const sorting = {
  sort: {
    field: 'title',
    direction: 'asc' as const,
  },
};

const title = i18n.translate('indexPatternManagement.dataViewTable.title', {
  defaultMessage: 'Data Views',
});

const securityDataView = i18n.translate(
  'indexPatternManagement.indexPatternTable.badge.securityDataViewTitle',
  {
    defaultMessage: 'Security Data View',
  }
);

const securitySolution = 'security-solution';

interface Props extends RouteComponentProps {
  canSave: boolean;
  showCreateDialog?: boolean;
}

const getEmptyFunctionComponent: React.FC<SpacesContextProps> = ({ children }) => <>{children}</>;

export const IndexPatternTable = ({
  history,
  canSave,
  showCreateDialog: showCreateDialogProp = false,
}: Props) => {
  const {
    setBreadcrumbs,
    http,
    uiSettings,
    application,
    chrome,
    dataViews,
    IndexPatternEditor,
    spaces,
    overlays,
    docLinks,
    noDataPage,
  } = useKibana<IndexPatternManagmentContext>().services;
  const [query, setQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(showCreateDialogProp);
  const [selectedItems, setSelectedItems] = useState<IndexPatternTableItem[]>([]);
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

  const handleOnChange = ({ queryText, error }: { queryText: string; error: unknown }) => {
    if (!error) {
      setQuery(queryText);
    }
  };

  const renderDeleteButton = () => {
    const clickHandler = removeDataView({
      dataViews,
      overlays,
      uiSettings,
      onDelete: () => {
        setSelectedItems([]);
        dataViewController.loadDataViews();
      },
    });
    if (selectedItems.length === 0) {
      return;
    }
    return (
      <EuiButton
        color="danger"
        iconType="trash"
        data-test-subj="delete-data-views-button"
        onClick={() => clickHandler(selectedItems, deleteModalMsg(selectedItems, !!spaces))}
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

  const isRollup =
    new URLSearchParams(useLocation().search).get('type') === DataViewType.ROLLUP &&
    dataViews.getRollupsEnabled();

  const ContextWrapper = useMemo(
    () => (spaces ? spaces.ui.components.getSpacesContextProvider : getEmptyFunctionComponent),
    [spaces]
  );

  const removeHandler = removeDataView({
    dataViews,
    uiSettings,
    overlays,
    onDelete: () => dataViewController.loadDataViews(),
  });

  const alertColumn = {
    name: 'Actions',
    field: 'id',
    width: '10%',
    actions: [
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
        onClick: (dataView: RemoveDataViewProps) =>
          removeHandler([dataView], deleteModalMsg([dataView], !!spaces)),
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
      render: (name: string, dataView: IndexPatternTableItem) => (
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
                  type="iInCircle"
                  color="text"
                  aria-label={dataView.title}
                  content={dataView.title}
                />
              </>
            ) : null}
          </EuiLink>
          {dataView?.id?.indexOf(securitySolution) === 0 && (
            <>
              &emsp;<EuiBadge>{securityDataView}</EuiBadge>
            </>
          )}
          {dataView?.tags?.map(({ key: tagKey, name: tagName }) => (
            <span key={tagKey}>
              &emsp;<EuiBadge>{tagName}</EuiBadge>
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
      render: (name: string, dataView: IndexPatternTableItem) => {
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
      data-test-subj="createIndexPatternButton"
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

  const displayIndexPatternEditor = showCreateDialog ? (
    <IndexPatternEditor
      onSave={(indexPattern) => {
        history.push(`patterns/${indexPattern.id}`);
      }}
      onCancel={() => setShowCreateDialog(false)}
      defaultTypeIsRollup={isRollup}
    />
  ) : (
    <></>
  );

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
          pagination={pagination}
          sorting={sorting}
          search={search}
          selection={dataViews.getCanSaveSync() ? selection : undefined}
        />
      </ContextWrapper>
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
    <div data-test-subj="indexPatternTable" role="region" aria-label={title}>
      {isLoadingDataState ? (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <EuiLoadingSpinner size="xxl" />
        </div>
      ) : (
        displayIndexPatternSection
      )}
      {displayIndexPatternEditor}
    </div>
  );
};

export const IndexPatternTableWithRouter = withRouter(IndexPatternTable);
