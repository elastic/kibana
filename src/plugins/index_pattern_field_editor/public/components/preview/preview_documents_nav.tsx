/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useState, useEffect } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldText,
  EuiButtonIcon,
  EuiButtonEmpty,
} from '@elastic/eui';

import { useFieldPreviewContext } from './field_preview_context';

export const PreviewDocumentsNav = () => {
  const {
    currentDocument: { value: currentDocument, loadSingle, loadFromCluster, isCustomID },
    navigation: { prev, next },
  } = useFieldPreviewContext();

  const [documentId, setDocumentId] = useState('');

  const errorMessage = null;
  const isInvalid = false;

  // We don't display the nav button when the user has entered a custom
  // document ID as at that point there is no more reference to what's "next"
  const showNavButtons = isCustomID === false;

  const onDocumentIdChange = useCallback(async (e: React.SyntheticEvent<HTMLInputElement>) => {
    const nextId = e.currentTarget.value;
    setDocumentId(nextId);
  }, []);

  useEffect(() => {
    if (currentDocument) {
      setDocumentId(currentDocument._id);
    }
  }, [currentDocument]);

  useDebounce(
    () => {
      if (!Boolean(documentId.trim())) {
        return;
      }

      if (documentId === currentDocument?._id) {
        return;
      }

      loadSingle(documentId);
    },
    500,
    [documentId, currentDocument]
  );

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('indexPatternFieldEditor.fieldPreview.documentIdField.label', {
            defaultMessage: 'Document ID',
          })}
          error={errorMessage}
          isInvalid={isInvalid}
          fullWidth
        >
          <EuiFieldText
            isInvalid={isInvalid}
            value={documentId}
            onChange={onDocumentIdChange}
            fullWidth
            data-test-subj="documentIdField"
          />
        </EuiFormRow>
        {isCustomID && (
          <span>
            <EuiButtonEmpty color="primary" size="xs" onClick={() => loadFromCluster()}>
              Load latest documents from cluster
            </EuiButtonEmpty>
          </span>
        )}
      </EuiFlexItem>

      {showNavButtons && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                display="base"
                size="m"
                onClick={prev}
                iconType="arrowLeft"
                aria-label="Previous"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                display="base"
                size="m"
                onClick={next}
                iconType="arrowRight"
                aria-label="Next"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
