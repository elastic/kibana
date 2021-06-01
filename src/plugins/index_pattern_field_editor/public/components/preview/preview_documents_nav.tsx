/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useState, useEffect, useRef } from 'react';
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
    currentDocument: { value: currentDocument, loadSingle, loadFromCluster, isLoading },
    navigation: { prev, next },
    error,
  } = useFieldPreviewContext();

  const lastDocumentLoaded = useRef<string | null>(null);
  const [documentId, setDocumentId] = useState('');
  const [isCustomID, setIsCustomID] = useState(false);

  const errorMessage =
    error !== null && error.code === 'DOC_NOT_FOUND'
      ? i18n.translate(
          'indexPatternFieldEditor.fieldPreview.documentIdField.documentNotFoundError',
          {
            defaultMessage: 'Document not found',
          }
        )
      : null;
  const isInvalid = error !== null;

  // We don't display the nav button when the user has entered a custom
  // document ID as at that point there is no more reference to what's "next"
  const showNavButtons = isCustomID === false;

  const onDocumentIdChange = useCallback((e: React.SyntheticEvent<HTMLInputElement>) => {
    setIsCustomID(true);
    const nextId = e.currentTarget.value;
    setDocumentId(nextId);
  }, []);

  const loadDocFromCluster = useCallback(() => {
    lastDocumentLoaded.current = null;
    setIsCustomID(false);
    loadFromCluster();
  }, [loadFromCluster]);

  useEffect(() => {
    if (currentDocument && !isCustomID) {
      setDocumentId(currentDocument._id);
    }
  }, [currentDocument, isCustomID]);

  useDebounce(
    () => {
      if (!isCustomID || !Boolean(documentId.trim())) {
        return;
      }

      if (lastDocumentLoaded.current === documentId) {
        return;
      }

      lastDocumentLoaded.current = documentId;

      loadSingle(documentId);
    },
    500,
    [documentId, isCustomID]
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
            isLoading={isLoading}
            fullWidth
            data-test-subj="documentIdField"
          />
        </EuiFormRow>
        {isCustomID && (
          <span>
            <EuiButtonEmpty color="primary" size="xs" flush="left" onClick={loadDocFromCluster}>
              {i18n.translate(
                'indexPatternFieldEditor.fieldPreview.documentIdField.loadDocumentsFromCluster',
                {
                  defaultMessage: 'Load documents from cluster',
                }
              )}
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
                aria-label={i18n.translate(
                  'indexPatternFieldEditor.fieldPreview.documentNav.previousArialabel',
                  {
                    defaultMessage: 'Previous',
                  }
                )}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                display="base"
                size="m"
                onClick={next}
                iconType="arrowRight"
                aria-label={i18n.translate(
                  'indexPatternFieldEditor.fieldPreview.documentNav.nextArialabel',
                  {
                    defaultMessage: 'Next',
                  }
                )}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
