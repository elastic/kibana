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

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  SavedObjectsClientContract,
  IUiSettingsClient,
  ChromeDocTitle,
} from '../../../../../core/public';
import { ManagementAppMountParams } from '../../../../management/public';
import { CreateButton } from '../create_button';
import { CreateIndexPatternPrompt } from '../create_index_pattern_prompt';
import { IndexPatternTableItem, IndexPatternCreationOption } from '../types';
import { IndexPatternManagementStart } from '../../plugin';
import { getIndexPatterns } from '../utils';
import { getListBreadcrumbs } from '../breadcrumbs';

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
      <EuiButtonEmpty size="xs" href={`#/management/kibana/indexPatterns/patterns/${index.id}`}>
        {name}
        {index.tags &&
          index.tags.map(({ key: tagKey, name: tagName }) => (
            <EuiBadge className="indexPatternList__badge" key={tagKey}>
              {tagName}
            </EuiBadge>
          ))}
      </EuiButtonEmpty>
    ),
    dataType: 'string' as const,
    sortable: ({ sort }: { sort: string }) => sort,
  },
];

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
  getIndexPatternCreationOptions: IndexPatternManagementStart['creation']['getIndexPatternCreationOptions'];
  canSave: boolean;
  services: {
    savedObjectsClient: SavedObjectsClientContract;
    uiSettings: IUiSettingsClient;
    setBreadcrumbs: ManagementAppMountParams['setBreadcrumbs'];
    indexPatternManagement: IndexPatternManagementStart;
    docTitle: ChromeDocTitle;
  };
}

export const IndexPatternTable = ({
  getIndexPatternCreationOptions,
  canSave,
  history,
  services,
}: Props) => {
  const [showFlyout, setShowFlyout] = useState(false);
  const [indexPatterns, setIndexPatterns] = useState<IndexPatternTableItem[]>([]);
  const [creationOptions, setCreationOptions] = useState<IndexPatternCreationOption[]>([]);

  services.setBreadcrumbs(getListBreadcrumbs());

  useEffect(() => {
    (async function() {
      const options = await getIndexPatternCreationOptions(history.push);
      const gettedIndexPatterns: IndexPatternTableItem[] = await getIndexPatterns(
        services.savedObjectsClient,
        services.uiSettings.get('defaultIndex'),
        services.indexPatternManagement
      );
      setCreationOptions(options);
      setIndexPatterns(gettedIndexPatterns);
      setShowFlyout(gettedIndexPatterns.length === 0);
    })();
  }, [
    getIndexPatternCreationOptions,
    history.push,
    indexPatterns.length,
    services.indexPatternManagement,
    services.savedObjectsClient,
    services.uiSettings,
  ]);

  services.docTitle.change(title);

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

  return (
    <EuiPanel
      paddingSize="l"
      data-test-subj="indexPatternTable"
      role="region"
      aria-label={ariaRegion}
    >
      {showFlyout && <CreateIndexPatternPrompt onClose={() => setShowFlyout(false)} />}
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false} className="euiIEFlexWrapFix">
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiText>
                <h2>{title}</h2>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconSize="l"
                iconType="questionInCircle"
                onClick={() => setShowFlyout(true)}
                aria-label="Help"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
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
    </EuiPanel>
  );
};

export const IndexPatternTableWithRouter = withRouter(IndexPatternTable);
