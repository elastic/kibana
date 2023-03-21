/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { EuiButtonEmpty, EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Markdown } from '@kbn/kibana-react-plugin/public';
import type { MaybePromise } from '@kbn/utility-types';
import { ErrorLike } from '@kbn/expressions-plugin/common';
import { distinctUntilChanged, merge, of, switchMap } from 'rxjs';
import { EditPanelAction } from '../actions';
import { EmbeddableInput, EmbeddableOutput, IEmbeddable } from '../embeddables';

interface EmbeddablePanelErrorProps {
  editPanelAction?: EditPanelAction;
  embeddable: IEmbeddable<EmbeddableInput, EmbeddableOutput, MaybePromise<ReactNode>>;
  error: ErrorLike;
}

export function EmbeddablePanelError({
  editPanelAction,
  embeddable,
  error,
}: EmbeddablePanelErrorProps) {
  const [isEditable, setEditable] = useState(false);
  const handleErrorClick = useMemo(
    () => (isEditable ? () => editPanelAction?.execute({ embeddable }) : undefined),
    [editPanelAction, embeddable, isEditable]
  );

  const label = useMemo(
    () => editPanelAction?.getDisplayName({ embeddable }),
    [editPanelAction, embeddable]
  );
  const title = useMemo(() => embeddable.getTitle(), [embeddable]);
  const ariaLabel = useMemo(
    () =>
      !title
        ? label
        : i18n.translate('embeddableApi.panel.editPanel.displayName', {
            defaultMessage: 'Edit {value}',
            values: { value: title },
          }),
    [label, title]
  );

  useEffect(() => {
    const subscription = merge(embeddable.getInput$(), embeddable.getOutput$())
      .pipe(
        switchMap(() => editPanelAction?.isCompatible({ embeddable }) ?? of(false)),
        distinctUntilChanged()
      )
      .subscribe(setEditable);

    return () => subscription.unsubscribe();
  }, [editPanelAction, embeddable]);

  return (
    <EuiEmptyPrompt
      body={
        <EuiText size="s">
          <Markdown
            markdown={error.message}
            openLinksInNewTab={true}
            data-test-subj="errorMessageMarkdown"
          />
        </EuiText>
      }
      data-test-subj="embeddableStackError"
      iconType="alert"
      iconColor="danger"
      layout="vertical"
      actions={
        isEditable && (
          <EuiButtonEmpty aria-label={ariaLabel} onClick={handleErrorClick} size="s">
            {label}
          </EuiButtonEmpty>
        )
      }
    />
  );
}
