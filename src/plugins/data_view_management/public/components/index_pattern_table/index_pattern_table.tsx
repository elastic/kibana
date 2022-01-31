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
import {
  MatchedItem,
  ResolveIndexResponseItemAlias,
} from '../../../../../plugins/data_view_editor/public';
import { reactRouterNavigate, useKibana } from '../../../../../plugins/kibana_react/public';
import { getIndices } from '../../../../../plugins/data_view_editor/public';
import { IndexPatternManagmentContext } from '../../types';
import { IndexPatternTableItem } from '../types';
import { getIndexPatterns } from '../utils';
import { getListBreadcrumbs } from '../breadcrumbs';
import { EmptyDataPrompt } from '../empty_data_prompt';
import { EmptyDataViewPrompt } from '../empty_data_view_prompt';
import { FLEET_ASSETS_TO_IGNORE } from '../../../../data/common';

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

const removeAliases = (item: MatchedItem) =>
  !(item as unknown as ResolveIndexResponseItemAlias).indices;

interface Props extends RouteComponentProps {
  canSave: boolean;
  showCreateDialog?: boolean;
}

function isUserDataIndex(source: MatchedItem) {
  // filter out indices that start with `.`
  if (source.name.startsWith('.')) return false;

  // filter out sources from FLEET_ASSETS_TO_IGNORE
  if (source.name === FLEET_ASSETS_TO_IGNORE.LOGS_DATA_STREAM_TO_IGNORE) return false;
  if (source.name === FLEET_ASSETS_TO_IGNORE.METRICS_DATA_STREAM_TO_IGNORE) return false;
  if (source.name === FLEET_ASSETS_TO_IGNORE.METRICS_ENDPOINT_INDEX_TO_IGNORE) return false;

  // filter out empty sources created by apm server
  if (source.name.startsWith('apm-')) return false;

  return true;
}

export const IndexPatternTable = ({
  history,
  canSave,
  showCreateDialog: showCreateDialogProp = false,
}: Props) => {
  const {
    http,
    setBreadcrumbs,
    uiSettings,
    indexPatternManagementStart,
    chrome,
    dataViews,
    docLinks,
    IndexPatternEditor,
    data,
  } = useKibana<IndexPatternManagmentContext>().services;
  const [indexPatterns, setIndexPatterns] = useState<IndexPatternTableItem[]>([]);
  const [isLoadingIndexPatterns, setIsLoadingIndexPatterns] = useState<boolean>(true);
  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(showCreateDialogProp);
  const [hasIndexPatterns, setHasIndexPatterns] = useState<boolean>(true);
  const [remoteClustersExist, setRemoteClustersExist] = useState<boolean>(false);
  const [hasCheckedRemoteClusters, setHasCheckedRemoteClusters] = useState<boolean>(false);
  const [hasDataIndices, setHasDataIndices] = useState<boolean>(false);

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
        setHasIndexPatterns(false);
      }
      getIndices({
        http,
        isRollupIndex: () => false,
        pattern: '*',
        showAllIndices: false,
        searchClient: data.search.search,
      }).then((dataSources) => {
        setHasDataIndices(dataSources.some(isUserDataIndex));
      });
      if (!hasDataIndices && !hasCheckedRemoteClusters) {
        setHasCheckedRemoteClusters(true);
        getIndices({
          http,
          isRollupIndex: () => false,
          pattern: '*:*',
          showAllIndices: false,
          searchClient: data.search.search,
        }).then((dataSources) => {
          setRemoteClustersExist(!!dataSources.filter(removeAliases).length);
        });
      }
    })();
  }, [
    hasCheckedRemoteClusters,
    hasDataIndices,
    http,
    indexPatternManagementStart,
    uiSettings,
    dataViews,
    data.search.search,
  ]);

  chrome.docTitle.change(title);

  const isRollup = new URLSearchParams(useLocation().search).get('type') === 'rollup';

  const columns = [
    {
      field: 'title',
      name: i18n.translate('indexPatternManagement.dataViewTable.nameColumn', {
        defaultMessage: 'Name',
      }),
      render: (
        name: string,
        index: {
          id: string;
          tags?: Array<{
            key: string;
            name: string;
          }>;
        }
      ) => (
        <>
          <EuiFlexGroup gutterSize="s" wrap>
            <EuiFlexItem grow={false} css={flexItemStyles}>
              <EuiButtonEmpty size="s" {...reactRouterNavigate(history, `patterns/${index.id}`)}>
                {name}
              </EuiButtonEmpty>
            </EuiFlexItem>
            {index.id && index.id.indexOf(securitySolution) === 0 && (
              <EuiFlexItem grow={false} css={flexItemStyles}>
                <EuiBadge>{securityDataView}</EuiBadge>
              </EuiFlexItem>
            )}
            {index.tags &&
              index.tags.map(({ key: tagKey, name: tagName }) => (
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
    </>
  );
  if (!hasIndexPatterns)
    displayIndexPatternSection = (
      <>
        <EuiSpacer size="xxl" />
        <EmptyDataViewPrompt
          goToCreate={() => setShowCreateDialog(true)}
          dataViewsIntroUrl={docLinks.links.indexPatterns.introduction}
          canSaveDataView={dataViews.getCanSaveSync()}
        />
      </>
    );
  if (!hasDataIndices && !remoteClustersExist)
    displayIndexPatternSection = (
      <>
        <EuiSpacer size="xxl" />
        <EmptyDataPrompt
          goToCreate={() => setShowCreateDialog(true)}
          addDataUrl={docLinks.links.addData}
          canAddData={dataViews.getCanSaveSync()}
        />
      </>
    );

  return (
    <div data-test-subj="indexPatternTable" role="region" aria-label={title}>
      {displayIndexPatternSection}
      {displayIndexPatternEditor}
    </div>
  );
};

export const IndexPatternTableWithRouter = withRouter(IndexPatternTable);
