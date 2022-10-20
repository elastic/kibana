/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrorLike } from '@kbn/expressions-plugin/common';
import { distinctUntilChanged, merge, of, switchMap } from 'rxjs';
import { EditPanelAction } from '../actions';
import { ErrorEmbeddable, IEmbeddable } from '../embeddables';

interface EmbeddablePanelErrorProps {
  editPanelAction?: EditPanelAction;
  embeddable: IEmbeddable;
  error: ErrorLike;
}

export function EmbeddablePanelError({
  editPanelAction,
  embeddable,
  error,
}: EmbeddablePanelErrorProps) {
  const [isEditable, setEditable] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const handleErrorClick = useMemo(
    () => (isEditable ? () => editPanelAction?.execute({ embeddable }) : undefined),
    [editPanelAction, embeddable, isEditable]
  );

  const title = embeddable.getTitle();
  const actionDisplayName = useMemo(
    () => editPanelAction?.getDisplayName({ embeddable }),
    [editPanelAction, embeddable]
  );
  const ariaLabel = useMemo(
    () =>
      !title
        ? actionDisplayName
        : i18n.translate('embeddableApi.panel.editPanel.displayName', {
            defaultMessage: 'Edit {value}',
            values: { value: title },
          }),
    [title, actionDisplayName]
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
  useEffect(() => {
    if (!ref.current) {
      return;
    }

    if (embeddable.renderError) {
      return embeddable.renderError(ref.current, error);
    }

    const errorEmbeddable = new ErrorEmbeddable(error, { id: embeddable.id });
    errorEmbeddable.render(ref.current);

    return () => errorEmbeddable.destroy();
  }, [embeddable, error]);

  return (
    <EuiPanel
      element="div"
      className="embPanel__content embPanel__content--error"
      color="transparent"
      paddingSize="none"
      data-test-subj="embeddableError"
      panelRef={ref}
      role={isEditable ? 'button' : undefined}
      aria-label={isEditable ? ariaLabel : undefined}
      onClick={handleErrorClick}
    />
  );
}
