/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiIcon } from '@elastic/eui';

import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { withEmbeddableSubscription } from '@kbn/embeddable-plugin/public';
import { BookEmbeddableInput, BookEmbeddableOutput, BookEmbeddable } from './book_embeddable';

interface Props {
  input: BookEmbeddableInput;
  output: BookEmbeddableOutput;
  embeddable: BookEmbeddable;
}

function wrapSearchTerms(task?: string, search?: string) {
  if (!search || !task) return task;
  const parts = task.split(new RegExp(`(${search})`, 'g'));
  return parts.map((part, i) =>
    part === search ? (
      <span key={i} style={{ backgroundColor: 'yellow' }}>
        {part}
      </span>
    ) : (
      part
    )
  );
}

export function BookEmbeddableComponentInner({
  input: { search },
  output: { attributes },
  embeddable,
}: Props) {
  const title = attributes?.title;
  const author = attributes?.author;
  const readIt = attributes?.readIt;

  const byReference = embeddable.inputIsRefType(embeddable.getInput());

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="s">
          {title ? (
            <EuiFlexItem>
              <EuiText data-test-subj="bookEmbeddableTitle">
                <h3>{wrapSearchTerms(title, search)}</h3>
              </EuiText>
            </EuiFlexItem>
          ) : null}
          {author ? (
            <EuiFlexItem>
              <EuiText data-test-subj="bookEmbeddableAuthor">
                -{wrapSearchTerms(author, search)}
              </EuiText>
            </EuiFlexItem>
          ) : null}
          {readIt ? (
            <EuiFlexItem>
              <EuiIcon type="check" />
            </EuiFlexItem>
          ) : (
            <EuiFlexItem>
              <EuiIcon type="cross" />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText data-test-subj="bookEmbeddableAuthor">
          <EuiIcon type={byReference ? 'folderCheck' : 'folderExclamation'} />{' '}
          <span>
            {byReference
              ? i18n.translate('embeddableExamples.book.byReferenceLabel', {
                  defaultMessage: 'Book is By Reference',
                })
              : i18n.translate('embeddableExamples.book.byValueLabel', {
                  defaultMessage: 'Book is By Value',
                })}
          </span>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export const BookEmbeddableComponent = withEmbeddableSubscription<
  BookEmbeddableInput,
  BookEmbeddableOutput,
  BookEmbeddable,
  {}
>(BookEmbeddableComponentInner);
