/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiFieldNumber,
  EuiFieldText,
  EuiFormControlLayout,
  EuiFormRow,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBatchedOptionalPublishingSubjects } from '@kbn/presentation-publishing';
import React from 'react';
import { BookStateManager } from './types';

export const SavedBookEditor = ({ bookStateManager }: { bookStateManager: BookStateManager }) => {
  const [authorName, bookDescription, bookTitle, numberOfPages] =
    useBatchedOptionalPublishingSubjects(
      bookStateManager.authorName,
      bookStateManager.bookDescription,
      bookStateManager.bookTitle,
      bookStateManager.numberOfPages
    );

  return (
    <EuiFormControlLayout>
      <EuiFormRow
        label={i18n.translate('embeddableExamples.savedBook.editor.authorLabel', {
          defaultMessage: 'Author',
        })}
      >
        <EuiFieldText
          value={authorName}
          onChange={(e) => bookStateManager.authorName.next(e.target.value)}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('embeddableExamples.savedBook.editor.titleLabel', {
          defaultMessage: 'Title',
        })}
      >
        <EuiFieldText
          value={bookTitle}
          onChange={(e) => bookStateManager.bookTitle.next(e.target.value)}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('embeddableExamples.savedBook.editor.pagesLabel', {
          defaultMessage: 'Number of pages',
        })}
      >
        <EuiFieldNumber
          value={numberOfPages}
          onChange={(e) => bookStateManager.numberOfPages.next(+e.target.value)}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('embeddableExamples.savedBook.editor.descriptionLabel', {
          defaultMessage: 'Book description',
        })}
      >
        <EuiTextArea
          value={bookDescription}
          onChange={(e) => bookStateManager.bookDescription.next(e.target.value)}
        />
      </EuiFormRow>
    </EuiFormControlLayout>
  );
};
