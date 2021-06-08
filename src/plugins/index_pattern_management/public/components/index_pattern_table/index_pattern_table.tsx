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
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiSpacer,
  EuiText,
  EuiBadgeGroup,
  EuiPageContent,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { reactRouterNavigate, useKibana } from '../../../../../plugins/kibana_react/public';
import { IndexPatternManagmentContext } from '../../types';
import { IndexPatternTableItem } from '../types';
import { getIndexPatterns } from '../utils';
import { getListBreadcrumbs } from '../breadcrumbs';

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

const ariaRegion = i18n.translate('indexPatternManagement.editIndexPatternLiveRegionAriaLabel', {
  defaultMessage: 'Index patterns',
});

const title = i18n.translate('indexPatternManagement.indexPatternTable.title', {
  defaultMessage: 'Index patterns',
});

interface Props extends RouteComponentProps {
  canSave: boolean;
}

export const IndexPatternTable = ({ history }: Props) => {
  const {
    setBreadcrumbs,
    uiSettings,
    indexPatternManagementStart,
    chrome,
    data,
    indexPatternEditor,
  } = useKibana<IndexPatternManagmentContext>().services;
  const [indexPatterns, setIndexPatterns] = useState<IndexPatternTableItem[]>([]);
  const [isLoadingIndexPatterns, setIsLoadingIndexPatterns] = useState<boolean>(true);

  setBreadcrumbs(getListBreadcrumbs());
  useEffect(() => {
    (async function () {
      const gettedIndexPatterns: IndexPatternTableItem[] = await getIndexPatterns(
        uiSettings.get('defaultIndex'),
        indexPatternManagementStart,
        data.indexPatterns
      );
      setIsLoadingIndexPatterns(false);
      setIndexPatterns(gettedIndexPatterns);
    })();
  }, [history.push, indexPatterns.length, indexPatternManagementStart, uiSettings, data]);

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
          <EuiButtonEmpty size="xs" {...reactRouterNavigate(history, `patterns/${index.id}`)}>
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

  /*
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
  */

  const createButton = (
    <EuiButton
      fill={true}
      iconType="plusInCircle"
      onClick={() =>
        indexPatternEditor.openEditor({
          onSave: async () => {
            // todo dedup from useEffect code
            const gettedIndexPatterns: IndexPatternTableItem[] = await getIndexPatterns(
              uiSettings.get('defaultIndex'),
              indexPatternManagementStart,
              data.indexPatterns
            );
            setIsLoadingIndexPatterns(false);
            setIndexPatterns(gettedIndexPatterns);
          },
        })
      }
    >
      <FormattedMessage
        id="indexPatternManagement.indexPatternTable.createBtn"
        defaultMessage="Create index pattern"
      />
    </EuiButton>
  );

  if (isLoadingIndexPatterns) {
    return <></>;
  }

  return (
    <EuiPageContent data-test-subj="indexPatternTable" role="region" aria-label={ariaRegion}>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h2>{title}</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText>
            <p>
              <FormattedMessage
                id="indexPatternManagement.indexPatternTable.indexPatternExplanation"
                defaultMessage="Create and manage the index patterns that help you retrieve your data from Elasticsearch."
              />
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{createButton}</EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
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
    </EuiPageContent>
  );
};

export const IndexPatternTableWithRouter = withRouter(IndexPatternTable);
