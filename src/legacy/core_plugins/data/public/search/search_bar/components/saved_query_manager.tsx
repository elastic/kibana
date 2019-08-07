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
  EuiPopover,
  EuiPopoverTitle,
  EuiButtonEmpty,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useEffect, useState, Fragment } from 'react';
import { sortBy } from 'lodash';
import { SavedQuery } from '../index';
import { getAllSavedQueries, deleteSavedQuery } from '../lib/saved_query_service';
import { Query } from '../../../query';

const pageCount = 50;

interface Props {
  showSaveQuery?: boolean;
  loadedSavedQuery?: SavedQuery;
  onSave: () => void;
  onSaveAsNew: () => void;
  onLoad: (savedQuery: SavedQuery) => void;
  query: Query;
  onClearSavedQuery: () => void;
}

export const SavedQueryManager: FunctionComponent<Props> = ({
  showSaveQuery,
  loadedSavedQuery,
  onSave,
  onSaveAsNew,
  onLoad,
  query,
  onClearSavedQuery,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [savedQueries, setSavedQueries] = useState([] as SavedQuery[]);

  const [activePage, setActivePage] = useState(0);

  useEffect(() => {
    const fetchQueries = async () => {
      const allSavedQueries = await getAllSavedQueries();
      const sortedAllSavedQueries = sortBy(allSavedQueries, 'attributes.title');
      setSavedQueries(sortedAllSavedQueries);
    };
    if (isOpen) {
      fetchQueries();
    }
  }, [isOpen]);

  const goToPage = (pageNumber: number) => {
    setActivePage(pageNumber);
  };

  const savedQueryDescriptionText = i18n.translate(
    'data.search.searchBar.savedQueryDescriptionText',
    {
      defaultMessage:
        'Saved queries allow you to save common search snippets and filters for later use.',
    }
  );

  const savedQueryPopoverTitleText = i18n.translate(
    'data.search.searchBar.savedQueryPopoverTitleText',
    {
      defaultMessage: 'Saved Queries',
    }
  );

  const onDeleteSavedQuery = (savedQuery: SavedQuery) => {
    setSavedQueries(savedQueries.filter(currentSavedQuery => currentSavedQuery !== savedQuery));

    if (loadedSavedQuery && loadedSavedQuery.id === savedQuery.id) {
      onClearSavedQuery();
    }

    deleteSavedQuery(savedQuery.id);
  };

  const filterTriggerButton = (
    <EuiButtonEmpty
      className="euiFormControlLayout__prepend"
      iconType="arrowDown"
      iconSide="right"
      onClick={() => {
        setIsOpen(!isOpen);
      }}
    >
      #
    </EuiButtonEmpty>
  );

  const savedQueryRows = () => {
    const savedQueriesDisplayRows = savedQueries.slice(
      activePage * pageCount,
      activePage * pageCount + pageCount
    );
    return savedQueriesDisplayRows.map(savedQuery => (
      <li key={savedQuery.id}>
        <EuiButtonEmpty
          onClick={() => {
            onLoad(savedQuery);
            setIsOpen(false);
          }}
          flush="left"
        >
          {savedQuery.attributes.title}
        </EuiButtonEmpty>
        <EuiButtonEmpty
          onClick={() => onDeleteSavedQuery(savedQuery)}
          iconType="trash"
          color="danger"
        />
      </li>
    ));
  };

  return (
    <EuiPopover
      id="savedQueryPopover"
      button={filterTriggerButton}
      isOpen={isOpen}
      closePopover={() => {
        setIsOpen(false);
      }}
      anchorPosition="downLeft"
    >
      <div className="saved-query-manager-popover">
        <EuiPopoverTitle>{savedQueryPopoverTitleText}</EuiPopoverTitle>
        {savedQueries.length > 0 ? (
          <Fragment>
            <EuiFlexGroup wrap>
              <EuiFlexItem>
                <EuiText>{savedQueryDescriptionText}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexGroup>
              <EuiFlexItem className="saved-query-list-wrapper">
                <ul className="saved-query-list">{savedQueryRows()}</ul>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexGroup justifyContent="spaceAround">
              <EuiFlexItem grow={false}>
                <EuiPagination
                  pageCount={Math.ceil(savedQueries.length / pageCount)}
                  activePage={activePage}
                  onPageClick={goToPage}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </Fragment>
        ) : (
          <EuiText grow={false}>
            <p>
              There are no saved queries. You can save search snippets and filters for later use.{' '}
              this, enter a query and click 'Save query for reuse'.
            </p>
          </EuiText>
        )}
        <EuiFlexGroup direction="rowReverse" alignItems="center" justifyContent="flexEnd">
          {showSaveQuery && loadedSavedQuery && (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiButton onClick={() => onSaveAsNew()}>
                    {i18n.translate('data.search.searchBar.savedQueryPopoverSaveAsNewButtonText', {
                      defaultMessage: 'Save As New',
                    })}
                  </EuiButton>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiButton fill onClick={() => onSave()}>
                    {i18n.translate(
                      'data.search.searchBar.savedQueryPopoverSaveChangesButtonText',
                      {
                        defaultMessage: 'Save changes',
                      }
                    )}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
          {showSaveQuery && !loadedSavedQuery && (
            <EuiFlexItem grow={false}>
              <EuiButton fill onClick={() => onSave()}>
                {i18n.translate('data.search.searchBar.savedQueryPopoverSaveButtonText', {
                  defaultMessage: 'Save',
                })}
              </EuiButton>
            </EuiFlexItem>
          )}
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => onClearSavedQuery()}>
              {loadedSavedQuery &&
                i18n.translate('data.search.searchBar.savedQueryPopoverClearButtonText', {
                  defaultMessage: 'Clear',
                })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};
