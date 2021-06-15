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
import { EuiButtonEmpty } from '@elastic/eui';

import { useFieldEditorContext } from '../../field_editor_context';
import { useFieldPreviewContext } from '../field_preview_context';
import { PreviewListItem } from './field_list_item';

import './field_list.scss';

const ITEM_HEIGHT = 40;
const SHOW_MORE_HEIGHT = 40;
const INITIAL_MAX_NUMBER_OF_FIELDS = 7;

export interface Field {
  key: string;
  value: string;
}

interface Props {
  height: number;
}

export const PreviewFieldList: React.FC<Props> = ({ height }) => {
  const { indexPattern } = useFieldEditorContext();
  const {
    currentDocument: { value: currentDocument },
  } = useFieldPreviewContext();

  const [showAllFields, setShowAllFields] = useState(false);

  const {
    fields: { getAll: getAllFields },
  } = indexPattern;

  const indexPatternFields = useMemo(() => {
    return getAllFields();
  }, [getAllFields]);

  const fieldsValues: Field[] = useMemo(
    () =>
      indexPatternFields
        .map((field) => ({
          key: field.displayName,
          value: JSON.stringify(get(currentDocument?._source, field.name)),
        }))
        .filter(({ value }) => value !== undefined),
    [indexPatternFields, currentDocument?._source]
  );

  const filteredFields = useMemo(
    () =>
      showAllFields
        ? fieldsValues
        : fieldsValues.filter((_, i) => i < INITIAL_MAX_NUMBER_OF_FIELDS),
    [fieldsValues, showAllFields]
  );

  // "height" corresponds to the total height of the flex item that occupies the remaining
  // vertical space up to the bottom of the flyout panel. We don't want to give that height
  // to the virtual list because it would mean that the "Show more" button would be pinned to the
  // bottom of the panel all the time. Which is not what we want when we render initially a few
  // fields.
  const listHeight = Math.min(filteredFields.length * ITEM_HEIGHT, height - SHOW_MORE_HEIGHT);

  const toggleShowAllFields = useCallback(() => {
    setShowAllFields((prev) => !prev);
  }, []);

  const renderToggleFieldsButton = () => (
    <EuiButtonEmpty onClick={toggleShowAllFields} flush="left">
      {showAllFields
        ? i18n.translate('indexPatternFieldEditor.fieldPreview.showLessFieldsButtonLabel', {
            defaultMessage: 'Show less',
          })
        : i18n.translate('indexPatternFieldEditor.fieldPreview.showMoreFieldsButtonLabel', {
            defaultMessage: 'Show more',
          })}
    </EuiButtonEmpty>
  );

  if (currentDocument === undefined || height === -1) {
    return null;
  }

  return (
    <div className="indexPatternFieldEditor__previewFieldList">
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
            <div key={field.key} style={style}>
              <PreviewListItem key={field.key} field={field} />
            </div>
          );
        }}
      />
      <div className="indexPatternFieldEditor__previewFieldList__showMore">
        {renderToggleFieldsButton()}
      </div>
    </div>
  );
};
