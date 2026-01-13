/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { RowComponentProps } from 'react-window';
import { List, useListRef } from 'react-window';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { get, isEqual } from 'lodash';
import {
  EuiButtonEmpty,
  EuiButton,
  EuiSpacer,
  EuiEmptyPrompt,
  EuiTextColor,
  type UseEuiTheme,
} from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

import { useFieldEditorContext } from '../../field_editor_context';
import { useFieldPreviewContext } from '../field_preview_context';
import type { FieldPreview, PreviewState } from '../types';
import { PreviewListItem } from './field_list_item';
import type { PreviewListItemProps } from './field_list_item';
import { useStateSelector } from '../../../state_utils';
import { getPositionAfterToggling } from './get_item_position';
import { ITEM_HEIGHT, INITIAL_MAX_NUMBER_OF_FIELDS } from './constants';

export type DocumentField = FieldPreview & {
  isPinned?: boolean;
};

interface Props {
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
  filteredFields: DocumentField[];
  toggleIsPinned: PreviewListItemProps['toggleIsPinned'];
}

const Row = ({
  index,
  style,
  ariaAttributes,
  filteredFields,
  toggleIsPinned,
}: RowComponentProps<RowProps>) => {
  const field = filteredFields[index];

  return (
    <div key={field.key} style={style} data-test-subj="indexPatternFieldList" {...ariaAttributes}>
      <PreviewListItem key={field.key} field={field} toggleIsPinned={toggleIsPinned} />
    </div>
  );
};

export const PreviewFieldList: React.FC<Props> = ({ clearSearch, searchValue = '' }) => {
  const styles = useMemoCss(componentStyles);
  const { dataView } = useFieldEditorContext();
  const { controller } = useFieldPreviewContext();
  const listRef = useListRef(null);
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
              <h3 css={styles.emptySearchResult}>
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
      <div>
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

  const toggleIsPinnedItem = useCallback(
    (fieldName: string, keyboardEvent: { isKeyboardEvent: boolean; buttonId: string }) => {
      controller.togglePinnedField(fieldName);

      if (!keyboardEvent.isKeyboardEvent) return;
      const newIndex = getPositionAfterToggling(fieldName, pinnedFields, fieldList);
      // If the field is currently pinned and it goes over the limit of the fields to show we need to show all of them
      if (newIndex >= INITIAL_MAX_NUMBER_OF_FIELDS && !showAllFields) toggleShowAllFields();
      requestAnimationFrame(() => {
        listRef.current?.scrollToRow({ index: newIndex, align: 'smart' });
        // We need to wait for the scroll to finish so the element is in the DOM before focusing it
        requestAnimationFrame(() => {
          document.getElementById(keyboardEvent.buttonId)?.focus();
        });
      });
    },
    [controller, pinnedFields, fieldList, showAllFields, toggleShowAllFields, listRef]
  );

  const rowProps = useMemo<RowProps>(
    () => ({
      filteredFields,
      toggleIsPinned: toggleIsPinnedItem,
    }),
    [filteredFields, toggleIsPinnedItem]
  );

  if (currentDocument === undefined) {
    return null;
  }

  return (
    <>
      <div className="indexPatternFieldEditor__previewFieldList" css={styles.previewFieldList}>
        {isEmptySearchResultVisible ? (
          renderEmptyResult()
        ) : (
          <List
            listRef={listRef}
            rowComponent={Row}
            rowCount={filteredFields.length}
            rowHeight={ITEM_HEIGHT}
            rowProps={rowProps}
            className="eui-yScrollWithShadows"
          />
        )}
      </div>
      {renderToggleFieldsButton()}
    </>
  );
};

const componentStyles = {
  emptySearchResult: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontWeight: euiTheme.font.weight.medium,
    }),
  previewFieldList: css({
    minHeight: 0,
  }),
};
