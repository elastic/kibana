/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSelectable,
  EuiText,
  EuiPopoverFooter,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiConfirmModal,
  usePrettyDuration,
  ShortDate,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { css } from '@emotion/react';
import { sortBy } from 'lodash';
import { useKibana } from '../../../../kibana_react/public';
import { SavedQuery, SavedQueryService, IDataPluginServices } from '../..';
import { SavedQueryAttributes } from '../../query';

export interface SavedQueryManagementListProps {
  showSaveQuery?: boolean;
  loadedSavedQuery?: SavedQuery;
  savedQueryService: SavedQueryService;
  onLoad: (savedQuery: SavedQuery) => void;
  onClearSavedQuery: () => void;
  onClose: () => void;
  hasFiltersOrQuery: boolean;
}

interface SelectableProps {
  key?: string;
  label: string;
  value?: string;
  checked?: 'on' | 'off' | undefined;
}

interface DurationRange {
  end: ShortDate;
  label?: string;
  start: ShortDate;
}

const commonDurationRanges: DurationRange[] = [
  { start: 'now/d', end: 'now/d', label: 'Today' },
  { start: 'now/w', end: 'now/w', label: 'This week' },
  { start: 'now/M', end: 'now/M', label: 'This month' },
  { start: 'now/y', end: 'now/y', label: 'This year' },
  { start: 'now-1d/d', end: 'now-1d/d', label: 'Yesterday' },
  { start: 'now/w', end: 'now', label: 'Week to date' },
  { start: 'now/M', end: 'now', label: 'Month to date' },
  { start: 'now/y', end: 'now', label: 'Year to date' },
];

const itemTitle = (attributes: SavedQueryAttributes, format: string) => {
  let label = attributes.title;

  if (attributes.description) {
    label += `; ${attributes.description}`;
  }

  if (attributes.timefilter) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    label += `; ${usePrettyDuration({
      timeFrom: attributes.timefilter?.from,
      timeTo: attributes.timefilter?.to,
      quickRanges: commonDurationRanges,
      dateFormat: format,
    })}`;
  }

  return label;
};

const itemLabel = (attributes: SavedQueryAttributes) => {
  let label: React.ReactNode = attributes.title;

  if (attributes.description) {
    label = (
      <>
        {label} <EuiIcon type="iInCircle" color="subdued" size="s" />
      </>
    );
  }

  if (attributes.timefilter) {
    label = (
      <>
        {label} <EuiIcon type="clock" color="subdued" size="s" />
      </>
    );
  }

  return label;
};

export function SavedQueryManagementList({
  showSaveQuery,
  loadedSavedQuery,
  onLoad,
  onClearSavedQuery,
  savedQueryService,
  onClose,
  hasFiltersOrQuery,
}: SavedQueryManagementListProps) {
  const kibana = useKibana<IDataPluginServices>();
  const [savedQueries, setSavedQueries] = useState([] as SavedQuery[]);
  const [selectedSavedQuery, setSelectedSavedQuery] = useState(null as SavedQuery | null);
  const [toBeDeletedSavedQuery, setToBeDeletedSavedQuery] = useState(null as SavedQuery | null);
  const [showDeletionConfirmationModal, setShowDeletionConfirmationModal] = useState(false);
  const cancelPendingListingRequest = useRef<() => void>(() => {});
  const { uiSettings, http } = kibana.services;
  const format = uiSettings.get('dateFormat');

  useEffect(() => {
    const fetchCountAndSavedQueries = async () => {
      cancelPendingListingRequest.current();
      let requestGotCancelled = false;
      cancelPendingListingRequest.current = () => {
        requestGotCancelled = true;
      };

      const { queries: savedQueryItems } = await savedQueryService.findSavedQueries();

      if (requestGotCancelled) return;

      const sortedSavedQueryItems = sortBy(savedQueryItems, 'attributes.title');
      setSavedQueries(sortedSavedQueryItems);
    };
    fetchCountAndSavedQueries();
  }, [savedQueryService]);

  const handleLoad = useCallback(() => {
    if (selectedSavedQuery) {
      onLoad(selectedSavedQuery);
      onClose();
    }
  }, [onLoad, selectedSavedQuery, onClose]);

  const handleSelect = useCallback((savedQueryToSelect) => {
    setSelectedSavedQuery(savedQueryToSelect);
  }, []);

  const handleDelete = useCallback((savedQueryToDelete: SavedQuery) => {
    setShowDeletionConfirmationModal(true);
    setToBeDeletedSavedQuery(savedQueryToDelete);
  }, []);

  const onDelete = useCallback(
    (savedQueryToDelete: string) => {
      const onDeleteSavedQuery = async (savedQueryId: string) => {
        cancelPendingListingRequest.current();
        setSavedQueries(
          savedQueries.filter((currentSavedQuery) => currentSavedQuery.id !== savedQueryId)
        );

        if (loadedSavedQuery && loadedSavedQuery.id === savedQueryId) {
          onClearSavedQuery();
        }

        await savedQueryService.deleteSavedQuery(savedQueryId);
      };

      onDeleteSavedQuery(savedQueryToDelete);
    },
    [loadedSavedQuery, onClearSavedQuery, savedQueries, savedQueryService]
  );

  const savedQueryDescriptionText = i18n.translate(
    'data.search.searchBar.savedQueryDescriptionText',
    {
      defaultMessage: 'Save query text and filters that you want to use again.',
    }
  );

  const noSavedQueriesDescriptionText =
    i18n.translate('data.search.searchBar.savedQueryNoSavedQueriesText', {
      defaultMessage: 'There are no saved queries.',
    }) +
    ' ' +
    savedQueryDescriptionText;

  const savedQueriesOptions = () => {
    const savedQueriesWithoutCurrent = savedQueries.filter((savedQuery) => {
      if (!loadedSavedQuery) return true;
      return savedQuery.id !== loadedSavedQuery.id;
    });
    const savedQueriesReordered =
      loadedSavedQuery && savedQueriesWithoutCurrent.length !== savedQueries.length
        ? [loadedSavedQuery, ...savedQueriesWithoutCurrent]
        : [...savedQueriesWithoutCurrent];

    return savedQueriesReordered.map((savedQuery) => {
      return {
        key: savedQuery.id,
        label: itemLabel(savedQuery.attributes),
        title: itemTitle(savedQuery.attributes, format),
        'data-test-subj': `load-saved-query-${savedQuery.attributes.title}-button`,
        value: savedQuery.id,
        checked:
          (loadedSavedQuery && savedQuery.id === loadedSavedQuery.id) ||
          (selectedSavedQuery && savedQuery.id === selectedSavedQuery.id)
            ? 'on'
            : undefined,
        append: !!showSaveQuery && (
          <EuiButtonIcon
            css={css`
              opacity: 0.2;
              filter: grayscale(100%);

              &:hover,
              &:focus:focus-visible {
                opacity: 1;
                filter: grayscale(0%);
              }
            `}
            iconType="trash"
            aria-label={`Delete ${savedQuery.attributes.title}`}
            data-test-subj={`delete-saved-query-${savedQuery.attributes.title}-button`}
            title={`Delete ${savedQuery.attributes.title}`}
            onClick={() => handleDelete(savedQuery)}
            color="danger"
          />
        ),
      };
    }) as unknown as SelectableProps[];
  };

  const listComponent = (
    <>
      {savedQueries.length > 0 ? (
        <>
          <div
            className="kbnSavedQueryManagement__listWrapper"
            data-test-subj="saved-query-management-list"
          >
            <EuiSelectable<SelectableProps>
              aria-label="Basic example"
              options={savedQueriesOptions()}
              searchable
              singleSelection="always"
              onChange={(choices) => {
                const choice = choices.find(({ checked }) => checked) as unknown as {
                  value: string;
                };
                if (choice) {
                  handleSelect(savedQueries.find((savedQuery) => savedQuery.id === choice.value));
                }
              }}
              searchProps={{
                compressed: true,
                placeholder: i18n.translate('data.query.queryBar.indexPattern.findFilterSet', {
                  defaultMessage: 'Find a filter set',
                }),
              }}
              listProps={{
                isVirtualized: true,
              }}
            >
              {(list, search) => (
                <>
                  <EuiPanel style={{ paddingBottom: 0 }} color="transparent" paddingSize="s">
                    {search}
                  </EuiPanel>
                  {list}
                </>
              )}
            </EuiSelectable>
          </div>
        </>
      ) : (
        <>
          <EuiText
            size="s"
            color="subdued"
            className="kbnSavedQueryManagement__text"
            data-test-subj="saved-query-management-empty"
          >
            <p>{noSavedQueriesDescriptionText}</p>
          </EuiText>
        </>
      )}
      <EuiPopoverFooter paddingSize="s">
        <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              href={http.basePath.prepend(
                `/app/management/kibana/objects?initialQuery=type:("query")`
              )}
              size="s"
            >
              Manage
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              fill
              onClick={handleLoad}
              disabled={!selectedSavedQuery}
              aria-label={i18n.translate(
                'data.search.searchBar.savedQueryPopoverApplyFilterSetLabel',
                {
                  defaultMessage: 'Apply filter set',
                }
              )}
              data-test-subj="saved-query-management-apply-changes-button"
            >
              {hasFiltersOrQuery
                ? i18n.translate('data.search.searchBar.savedQueryPopoverReplaceFilterSetLabel', {
                    defaultMessage: 'Replace with selected filter set',
                  })
                : i18n.translate('data.search.searchBar.savedQueryPopoverApplyFilterSetLabel', {
                    defaultMessage: 'Apply filter set',
                  })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
      {showDeletionConfirmationModal && toBeDeletedSavedQuery && (
        <EuiConfirmModal
          title={i18n.translate('data.search.searchBar.savedQueryPopoverConfirmDeletionTitle', {
            defaultMessage: 'Delete "{savedQueryName}"?',
            values: {
              savedQueryName: toBeDeletedSavedQuery.attributes.title,
            },
          })}
          confirmButtonText={i18n.translate(
            'data.search.searchBar.savedQueryPopoverConfirmDeletionConfirmButtonText',
            {
              defaultMessage: 'Delete',
            }
          )}
          cancelButtonText={i18n.translate(
            'data.search.searchBar.savedQueryPopoverConfirmDeletionCancelButtonText',
            {
              defaultMessage: 'Cancel',
            }
          )}
          onConfirm={() => {
            onDelete(toBeDeletedSavedQuery.id);
            setShowDeletionConfirmationModal(false);
          }}
          buttonColor="danger"
          onCancel={() => {
            setShowDeletionConfirmationModal(false);
          }}
        />
      )}
    </>
  );

  return listComponent;
}
