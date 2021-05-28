/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiBadge, EuiButtonEmpty, EuiInMemoryTable, EuiBadgeGroup } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import React, { useState, useEffect, ComponentType } from 'react';
import { i18n } from '@kbn/i18n';
import {
  reactRouterNavigate,
  useKibana,
  KibanaPageTemplateProps,
} from '../../../../kibana_react/public';
import { IndexPatternManagmentContext } from '../../types';
import { CreateButton } from '../create_button';
import { IndexPatternTableItem, IndexPatternCreationOption } from '../types';
import { getIndexPatterns } from '../utils';
import { getListBreadcrumbs } from '../breadcrumbs';
import { EmptyState } from './empty_state';
import { MatchedItem, ResolveIndexResponseItemAlias } from '../create_index_pattern_wizard/types';
import { EmptyIndexPatternPrompt } from './empty_index_pattern_prompt';
import { getIndices } from '../create_index_pattern_wizard/lib';

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

const title = i18n.translate('indexPatternManagement.indexPatternTable.title', {
  defaultMessage: 'Index Patterns',
});

interface Props extends RouteComponentProps {
  canSave: boolean;
  managementPageLayout: ComponentType<KibanaPageTemplateProps>;
}

export const IndexPatternTable = ({
  canSave,
  history,
  managementPageLayout: ManagementPageLayout,
}: Props) => {
  const {
    setBreadcrumbs,
    uiSettings,
    indexPatternManagementStart,
    chrome,
    docLinks,
    application,
    http,
    data,
    getMlCardState,
  } = useKibana<IndexPatternManagmentContext>().services;
  const [indexPatterns, setIndexPatterns] = useState<IndexPatternTableItem[]>([]);
  const [creationOptions, setCreationOptions] = useState<IndexPatternCreationOption[]>([]);
  const [sources, setSources] = useState<MatchedItem[]>([]);
  const [remoteClustersExist, setRemoteClustersExist] = useState<boolean>(false);
  const [isLoadingSources, setIsLoadingSources] = useState<boolean>(true);
  const [isLoadingIndexPatterns, setIsLoadingIndexPatterns] = useState<boolean>(true);

  setBreadcrumbs(getListBreadcrumbs());
  useEffect(() => {
    (async function () {
      const options = await indexPatternManagementStart.creation.getIndexPatternCreationOptions(
        history.push
      );
      const gettedIndexPatterns: IndexPatternTableItem[] = await getIndexPatterns(
        uiSettings.get('defaultIndex'),
        indexPatternManagementStart,
        data.indexPatterns
      );
      setIsLoadingIndexPatterns(false);
      setCreationOptions(options);
      setIndexPatterns(gettedIndexPatterns);
    })();
  }, [history.push, indexPatterns.length, indexPatternManagementStart, uiSettings, data]);

  const removeAliases = (item: MatchedItem) =>
    !((item as unknown) as ResolveIndexResponseItemAlias).indices;

  const loadSources = () => {
    getIndices(http, () => [], '*', false).then((dataSources) =>
      setSources(dataSources.filter(removeAliases))
    );
    getIndices(http, () => [], '*:*', false).then((dataSources) =>
      setRemoteClustersExist(!!dataSources.filter(removeAliases).length)
    );
  };

  useEffect(() => {
    getIndices(http, () => [], '*', false).then((dataSources) => {
      setSources(dataSources.filter(removeAliases));
      setIsLoadingSources(false);
    });
    getIndices(http, () => [], '*:*', false).then((dataSources) =>
      setRemoteClustersExist(!!dataSources.filter(removeAliases).length)
    );
  }, [http, creationOptions]);

  chrome.docTitle.change(title);

  const columns = [
    {
      field: 'title',
      name: 'Pattern',
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
          <EuiButtonEmpty size="s" {...reactRouterNavigate(history, `patterns/${index.id}`)}>
            {name}
          </EuiButtonEmpty>
          &emsp;
          <EuiBadgeGroup gutterSize="s">
            {index.tags &&
              index.tags.map(({ key: tagKey, name: tagName }) => (
                <EuiBadge key={tagKey}>{tagName}</EuiBadge>
              ))}
          </EuiBadgeGroup>
        </>
      ),
      dataType: 'string' as const,
      sortable: ({ sort }: { sort: string }) => sort,
    },
  ];

  const createButton = canSave ? (
    <CreateButton options={creationOptions}>
      <FormattedMessage
        id="indexPatternManagement.indexPatternTable.createBtn"
        defaultMessage="Create index pattern"
      />
    </CreateButton>
  ) : (
    <></>
  );

  if (isLoadingSources || isLoadingIndexPatterns) {
    return <></>;
  }

  const hasDataIndices = sources.some(({ name }: MatchedItem) => !name.startsWith('.'));

  if (!indexPatterns.length) {
    if (!hasDataIndices && !remoteClustersExist) {
      return (
        <EmptyState
          onRefresh={loadSources}
          docLinks={docLinks}
          navigateToApp={application.navigateToApp}
          getMlCardState={getMlCardState}
          canSave={canSave}
        />
      );
    } else {
      return (
        <EmptyIndexPatternPrompt
          canSave={canSave}
          creationOptions={creationOptions}
          docLinksIndexPatternIntro={docLinks.links.indexPatterns.introduction}
          setBreadcrumbs={setBreadcrumbs}
        />
      );
    }
  }

  return (
    <ManagementPageLayout
      data-test-subj="indexPatternTable"
      pageHeader={{
        pageTitle: title,
        rightSideItems: [createButton],
        description: (
          <FormattedMessage
            id="indexPatternManagement.indexPatternTable.indexPatternExplanation"
            defaultMessage="Create and manage the index patterns that help you retrieve your data from Elasticsearch."
          />
        ),
      }}
    >
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
    </ManagementPageLayout>
  );
};

export const IndexPatternTableWithRouter = withRouter(IndexPatternTable);
