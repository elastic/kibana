/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { FixedSizeList as VirtualList, areEqual } from 'react-window';
import { i18n } from '@kbn/i18n';
import { get, isEqual } from 'lodash';
import { EuiButtonEmpty, EuiButton, EuiSpacer, EuiEmptyPrompt, EuiTextColor } from '@elastic/eui';

import { useFieldEditorContext } from '../../field_editor_context';
import { useFieldPreviewContext } from '../field_preview_context';
import type { FieldPreview, PreviewState } from '../types';
import { PreviewListItem } from './field_list_item';
import type { PreviewListItemProps } from './field_list_item';
import { useStateSelector } from '../../../state_utils';

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

const pinnedFieldsSelector = (s: PreviewState) => s.pinnedFields;
const currentDocumentSelector = (s: PreviewState) => s.documents[s.currentIdx];
const fieldMapSelector = (s: PreviewState) => s.fieldMap;

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: { filteredFields: DocumentField[]; toggleIsPinned: PreviewListItemProps['toggleIsPinned'] };
}

const Row = React.memo<RowProps>(({ data, index, style }) => {
  // Data passed to List as "itemData" is available as props.data
  const { filteredFields, toggleIsPinned } = data;
  const field = filteredFields[index];

  return (
    <div key={field.key} style={style} data-test-subj="indexPatternFieldList">
      <PreviewListItem key={field.key} field={field} toggleIsPinned={toggleIsPinned} />
    </div>
  );
}, areEqual);

export const PreviewFieldList: React.FC<Props> = ({ height, clearSearch, searchValue = '' }) => {
  const { dataView } = useFieldEditorContext();
  const { controller } = useFieldPreviewContext();
  const pinnedFields = useStateSelector(controller.state$, pinnedFieldsSelector, isEqual);
  const currentDocument = useStateSelector(controller.state$, currentDocumentSelector);
  const fieldMap = useStateSelector(controller.state$, fieldMapSelector);

  const [showAllFields, setShowAllFields] = useState(false);

  const fieldList: DocumentField[] = useMemo(
    () =>
      Object.values(fieldMap)
        .map((field) => {
          const { name, displayName } = field;
          const formatter = dataView.getFormatterForField(field);
          const value = get(currentDocument?.fields, name);
          const formattedValue = formatter.convert(value, 'html');

          return {
            key: displayName,
            value,
            formattedValue,
            isPinned: false,
          };
        })
        .filter(({ value }) => value !== undefined),
    [dataView, fieldMap, currentDocument?.fields]
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

  const itemData = useMemo(
    () => ({ filteredFields, toggleIsPinned: controller.togglePinnedField }),
    [filteredFields, controller.togglePinnedField]
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
          className="eui-scrollBar"
          style={{ overflowX: 'hidden' }}
          width="100%"
          height={listHeight}
          itemData={itemData}
          itemCount={filteredFields.length}
          itemSize={ITEM_HEIGHT}
        >
          {Row}
        </VirtualList>
      )}

      {renderToggleFieldsButton()}
    </div>
  );
};
