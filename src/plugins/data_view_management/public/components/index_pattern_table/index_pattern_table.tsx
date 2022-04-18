/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiBadge,
  EuiButton,
  EuiLink,
  EuiInMemoryTable,
  EuiPageHeader,
  EuiSpacer,
  EuiIconTip,
  EuiBasicTableColumn,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { RouteComponentProps, withRouter, useLocation } from 'react-router-dom';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { reactRouterNavigate, useKibana } from '@kbn/kibana-react-plugin/public';
import type { SpacesContextProps } from '@kbn/spaces-plugin/public';
import { IndexPatternManagmentContext } from '../../types';
import { IndexPatternTableItem } from '../types';
import { getIndexPatterns } from '../utils';
import { getListBreadcrumbs } from '../breadcrumbs';
import { SpacesList } from './spaces_list';
import { removeDataView, RemoveDataViewProps } from '../edit_index_pattern';
import { deleteModalMsg } from './delete_modal_msg';

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
    uiSettings,
    indexPatternManagementStart,
    application,
    chrome,
    dataViews,
    IndexPatternEditor,
    spaces,
    overlays,
  } = useKibana<IndexPatternManagmentContext>().services;
  const [query, setQuery] = useState('');
  const [indexPatterns, setIndexPatterns] = useState<IndexPatternTableItem[]>([]);
  const [isLoadingIndexPatterns, setIsLoadingIndexPatterns] = useState<boolean>(true);
  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(showCreateDialogProp);
  const [selectedItems, setSelectedItems] = useState<IndexPatternTableItem[]>([]);

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
        loadDataViews();
      },
    });
    if (selectedItems.length === 0) {
      return;
    }
    return (
      <EuiButton
        color="danger"
        iconType="trash"
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

  const loadDataViews = useCallback(async () => {
    setIsLoadingIndexPatterns(true);
    const gettedIndexPatterns: IndexPatternTableItem[] = await getIndexPatterns(
      uiSettings.get('defaultIndex'),
      dataViews
    );
    setIndexPatterns(gettedIndexPatterns);
    setIsLoadingIndexPatterns(false);
    return gettedIndexPatterns;
  }, [dataViews, uiSettings]);

  setBreadcrumbs(getListBreadcrumbs());
  useEffect(() => {
    (async function () {
      const gettedIndexPatterns = await loadDataViews();
      if (
        gettedIndexPatterns.length === 0 ||
        !(await dataViews.hasUserDataView().catch(() => false))
      ) {
        setShowCreateDialog(true);
      }
    })();
  }, [indexPatternManagementStart, uiSettings, dataViews, loadDataViews]);

  chrome.docTitle.change(title);

  const isRollup = new URLSearchParams(useLocation().search).get('type') === 'rollup';

  const ContextWrapper = useMemo(
    () => (spaces ? spaces.ui.components.getSpacesContextProvider : getEmptyFunctionComponent),
    [spaces]
  );

  const removeHandler = removeDataView({
    dataViews,
    uiSettings,
    overlays,
    onDelete: () => loadDataViews(),
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
      width: '70%',
      render: (name: string, dataView: IndexPatternTableItem) => (
        <div>
          <EuiLink {...reactRouterNavigate(history, `patterns/${dataView.id}`)}>
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
            <>
              &emsp;<EuiBadge key={tagKey}>{tagName}</EuiBadge>
            </>
          ))}
        </div>
      ),
      dataType: 'string' as const,
      sortable: ({ sort }: { sort: string }) => sort,
    },
    {
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
              dataViews.clearCache(dataView.id);
              loadDataViews();
            }}
          />
        ) : (
          <></>
        );
      },
    },
  ];

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

  return (
    <div data-test-subj="indexPatternTable" role="region" aria-label={title}>
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
          isSelectable={dataViews.getCanSaveSync()}
          items={indexPatterns}
          columns={columns}
          pagination={pagination}
          sorting={sorting}
          search={search}
          selection={selection}
        />
      </ContextWrapper>
      {displayIndexPatternEditor}
    </div>
  );
};

export const IndexPatternTableWithRouter = withRouter(IndexPatternTable);
