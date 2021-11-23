/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback } from 'react';
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

export const DocumentsNavPreview = () => {
  const {
    currentDocument: { id: documentId, isCustomId },
    documents: { loadSingle, loadFromCluster, fetchDocError },
    navigation: { prev, next },
  } = useFieldPreviewContext();

  const isInvalid = fetchDocError?.code === 'DOC_NOT_FOUND';

  // We don't display the nav button when the user has entered a custom
  // document ID as at that point there is no more reference to what's "next"
  const showNavButtons = isCustomId === false;

  const onDocumentIdChange = useCallback(
    (e: React.SyntheticEvent<HTMLInputElement>) => {
      const nextId = (e.target as HTMLInputElement).value;
      loadSingle(nextId);
    },
    [loadSingle]
  );

  return (
    <div>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('indexPatternFieldEditor.fieldPreview.documentIdField.label', {
              defaultMessage: 'Document ID',
            })}
            isInvalid={isInvalid}
            fullWidth
          >
            <EuiFieldText
              isInvalid={isInvalid}
              value={documentId ?? ''}
              onChange={onDocumentIdChange}
              fullWidth
              data-test-subj="documentIdField"
            />
          </EuiFormRow>
          {isCustomId && (
            <span>
              <EuiButtonEmpty
                color="primary"
                size="xs"
                flush="left"
                onClick={() => loadFromCluster()}
                data-test-subj="loadDocsFromClusterButton"
              >
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
          <EuiFlexItem grow={false} data-test-subj="documentsNav">
            <EuiFlexGroup gutterSize="s" alignItems="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  display="base"
                  size="m"
                  onClick={prev}
                  iconType="arrowLeft"
                  data-test-subj="goToPrevDocButton"
                  aria-label={i18n.translate(
                    'indexPatternFieldEditor.fieldPreview.documentNav.previousArialabel',
                    {
                      defaultMessage: 'Previous document',
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
                  data-test-subj="goToNextDocButton"
                  aria-label={i18n.translate(
                    'indexPatternFieldEditor.fieldPreview.documentNav.nextArialabel',
                    {
                      defaultMessage: 'Next document',
                    }
                  )}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );
};
