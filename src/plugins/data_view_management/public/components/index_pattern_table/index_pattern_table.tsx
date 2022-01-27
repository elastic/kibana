/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiInMemoryTable,
  EuiPageHeader,
  EuiSpacer,
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { RouteComponentProps, withRouter, useLocation } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { reactRouterNavigate, useKibana } from '../../../../../plugins/kibana_react/public';
import { IndexPatternManagmentContext } from '../../types';
import { IndexPatternTableItem } from '../types';
import { getIndexPatterns } from '../utils';
import { getListBreadcrumbs } from '../breadcrumbs';
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

const search = {
  box: {
    incremental: true,
    schema: {
      fields: { title: { type: 'string' } },
    },
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

const flexItemStyles = css`
  justify-content: center;
`;

interface Props extends RouteComponentProps {
  canSave: boolean;
  showCreateDialog?: boolean;
}

export const IndexPatternTable = ({
  history,
  canSave,
  showCreateDialog: showCreateDialogProp = false,
}: Props) => {
  const {
    setBreadcrumbs,
    uiSettings,
    indexPatternManagementStart,
    chrome,
    dataViews,
    IndexPatternEditor,
    spaces,
  } = useKibana<IndexPatternManagmentContext>().services;
  const [indexPatterns, setIndexPatterns] = useState<IndexPatternTableItem[]>([]);
  const [isLoadingIndexPatterns, setIsLoadingIndexPatterns] = useState<boolean>(true);
  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(showCreateDialogProp);

  setBreadcrumbs(getListBreadcrumbs());
  useEffect(() => {
    (async function () {
      const gettedIndexPatterns: IndexPatternTableItem[] = await getIndexPatterns(
        uiSettings.get('defaultIndex'),
        dataViews
      );
      setIndexPatterns(gettedIndexPatterns);
      setIsLoadingIndexPatterns(false);
      if (
        gettedIndexPatterns.length === 0 ||
        !(await dataViews.hasUserDataView().catch(() => false))
      ) {
        setShowCreateDialog(true);
      }
    })();
  }, [indexPatternManagementStart, uiSettings, dataViews]);

  chrome.docTitle.change(title);

  const isRollup = new URLSearchParams(useLocation().search).get('type') === 'rollup';

  const columns = [
    {
      field: 'title',
      name: i18n.translate('indexPatternManagement.dataViewTable.nameColumn', {
        defaultMessage: 'Name',
      }),
      render: (name: string, dataView: IndexPatternTableItem) => (
        <>
          <EuiFlexGroup gutterSize="s" wrap>
            <EuiFlexItem grow={false} css={flexItemStyles}>
              <EuiButtonEmpty size="s" {...reactRouterNavigate(history, `patterns/${dataView.id}`)}>
                {name}
              </EuiButtonEmpty>
            </EuiFlexItem>
            {dataView?.id?.indexOf(securitySolution) === 0 && (
              <EuiFlexItem grow={false} css={flexItemStyles}>
                <EuiBadge>{securityDataView}</EuiBadge>
              </EuiFlexItem>
            )}
            {dataView?.tags?.map(({ key: tagKey, name: tagName }) => (
              <EuiFlexItem grow={false} css={flexItemStyles} key={tagKey}>
                <EuiBadge>{tagName}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      ),
      dataType: 'string' as const,
      sortable: ({ sort }: { sort: string }) => sort,
    },
    {
      field: 'namespaces',
      name: 'spaces',
      render: (name: string, dataView: IndexPatternTableItem) => {
        return spaces ? (
          <SpacesList
            spacesApi={spaces}
            spaceIds={dataView.namespaces || []}
            id={dataView.id}
            refresh={() => console.log('refresh list!!')}
          />
        ) : (
          <></>
        );
      },
    },
  ];

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

  console.log('indexPatterns', indexPatterns);

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

      <EuiInMemoryTable
        allowNeutralSort={false}
        itemId="id"
        isSelectable={false}
        items={indexPatterns}
        columns={columns}
        pagination={pagination}
        sorting={sorting}
        search={search}
      />
      {displayIndexPatternEditor}
    </div>
  );
};

export const IndexPatternTableWithRouter = withRouter(IndexPatternTable);
