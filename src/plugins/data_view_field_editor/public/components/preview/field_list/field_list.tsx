/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState, useMemo, useCallback } from 'react';
import VirtualList from 'react-tiny-virtual-list';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { EuiButtonEmpty, EuiButton, EuiSpacer, EuiEmptyPrompt, EuiTextColor } from '@elastic/eui';

import { useFieldEditorContext } from '../../field_editor_context';
import { useFieldPreviewContext, defaultValueFormatter } from '../field_preview_context';
import type { FieldPreview } from '../types';
import { PreviewListItem } from './field_list_item';

import './field_list.scss';

const ITEM_HEIGHT = 40;
const SHOW_MORE_HEIGHT = 40;
const INITIAL_MAX_NUMBER_OF_FIELDS = 7;

export type DocumentField = FieldPreview & {
  isPinned?: boolean;
};

interface Props {
  height: number;
  clearSearch: () => void;
  searchValue?: string;
}

/**
 * Escape regex special characters (e.g /, ^, $...) with a "\"
 * Copied from https://stackoverflow.com/a/9310752
 */
function escapeRegExp(text: string) {
  return text.replace(/[-\[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

function fuzzyMatch(searchValue: string, text: string) {
  const pattern = `.*${searchValue.split('').map(escapeRegExp).join('.*')}.*`;
  const regex = new RegExp(pattern, 'i');
  return regex.test(text);
}

export const PreviewFieldList: React.FC<Props> = ({ height, clearSearch, searchValue = '' }) => {
  const { dataView } = useFieldEditorContext();
  const {
    currentDocument: { value: currentDocument },
    pinnedFields: { value: pinnedFields, set: setPinnedFields },
  } = useFieldPreviewContext();

  const [showAllFields, setShowAllFields] = useState(false);

  const {
    fields: { getAll: getAllFields },
  } = dataView;

  const indexPatternFields = useMemo(() => {
    return getAllFields();
  }, [getAllFields]);

  const fieldList: DocumentField[] = useMemo(
    () =>
      indexPatternFields
        .map(({ name, displayName }) => {
          const value = get(currentDocument?._source, name);
          const formattedValue = defaultValueFormatter(value);

          return {
            key: displayName,
            value,
            formattedValue,
            isPinned: false,
          };
        })
        .filter(({ value }) => value !== undefined),
    [indexPatternFields, currentDocument?._source]
  );

  const fieldListWithPinnedFields: DocumentField[] = useMemo(() => {
    const pinned: DocumentField[] = [];
    const notPinned: DocumentField[] = [];

    fieldList.forEach((field) => {
      if (pinnedFields[field.key]) {
        pinned.push({ ...field, isPinned: true });
      } else {
        notPinned.push({ ...field, isPinned: false });
      }
    });

    return [...pinned, ...notPinned];
  }, [fieldList, pinnedFields]);

  const { filteredFields, totalFields } = useMemo(() => {
    const list =
      searchValue.trim() === ''
        ? fieldListWithPinnedFields
        : fieldListWithPinnedFields.filter(({ key }) => fuzzyMatch(searchValue, key));

    const total = list.length;

    if (showAllFields) {
      return {
        filteredFields: list,
        totalFields: total,
      };
    }

    return {
      filteredFields: list.filter((_, i) => i < INITIAL_MAX_NUMBER_OF_FIELDS),
      totalFields: total,
    };
  }, [fieldListWithPinnedFields, showAllFields, searchValue]);

  const hasSearchValue = searchValue.trim() !== '';
  const isEmptySearchResultVisible = hasSearchValue && totalFields === 0;

  // "height" corresponds to the total height of the flex item that occupies the remaining
  // vertical space up to the bottom of the flyout panel. We don't want to give that height
  // to the virtual list because it would mean that the "Show more" button would be pinned to the
  // bottom of the panel all the time. Which is not what we want when we render initially a few
  // fields.
  const listHeight = Math.min(filteredFields.length * ITEM_HEIGHT, height - SHOW_MORE_HEIGHT);

  const toggleShowAllFields = useCallback(() => {
    setShowAllFields((prev) => !prev);
  }, []);

  const toggleIsPinnedField = useCallback(
    (name) => {
      setPinnedFields((prev) => {
        const isPinned = !prev[name];
        return {
          ...prev,
          [name]: isPinned,
        };
      });
    },
    [setPinnedFields]
  );

  const renderEmptyResult = () => {
    return (
      <>
        <EuiSpacer />
        <EuiEmptyPrompt
          iconType="search"
          title={
            <EuiTextColor color="subdued">
              <h3 className="indexPatternFieldEditor__previewEmptySearchResult__title">
                {i18n.translate(
                  'indexPatternFieldEditor.fieldPreview.searchResult.emptyPromptTitle',
                  {
                    defaultMessage: 'No matching fields in this data view',
                  }
                )}
              </h3>
            </EuiTextColor>
          }
          titleSize="xs"
          actions={
            <EuiButton onClick={clearSearch} data-test-subj="clearSearchButton">
              {i18n.translate(
                'indexPatternFieldEditor.fieldPreview.searchResult.emptyPrompt.clearSearchButtonLabel',
                {
                  defaultMessage: 'Clear search',
                }
              )}
            </EuiButton>
          }
          data-test-subj="emptySearchResult"
        />
      </>
    );
  };

  const renderToggleFieldsButton = () =>
    totalFields <= INITIAL_MAX_NUMBER_OF_FIELDS ? null : (
      <div className="indexPatternFieldEditor__previewFieldList__showMore">
        <EuiButtonEmpty onClick={toggleShowAllFields} flush="left">
          {showAllFields
            ? i18n.translate('indexPatternFieldEditor.fieldPreview.showLessFieldsButtonLabel', {
                defaultMessage: 'Show less',
              })
            : i18n.translate('indexPatternFieldEditor.fieldPreview.showMoreFieldsButtonLabel', {
                defaultMessage: 'Show more',
              })}
        </EuiButtonEmpty>
      </div>
    );

  if (currentDocument === undefined || height === -1) {
    return null;
  }

  return (
    <div className="indexPatternFieldEditor__previewFieldList">
      {isEmptySearchResultVisible ? (
        renderEmptyResult()
      ) : (
        <VirtualList
          style={{ overflowX: 'hidden' }}
          width="100%"
          height={listHeight}
          itemCount={filteredFields.length}
          itemSize={ITEM_HEIGHT}
          overscanCount={4}
          renderItem={({ index, style }) => {
            const field = filteredFields[index];

            return (
              <div key={field.key} style={style} data-test-subj="indexPatternFieldList">
                <PreviewListItem
                  key={field.key}
                  field={field}
                  toggleIsPinned={toggleIsPinnedField}
                />
              </div>
            );
          }}
        />
      )}

      {renderToggleFieldsButton()}
    </div>
  );
};
