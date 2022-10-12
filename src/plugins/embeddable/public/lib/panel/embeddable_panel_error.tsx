/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isFunction } from 'lodash';
import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isPromise } from '@kbn/std';
import type { MaybePromise } from '@kbn/utility-types';
import { ErrorLike } from '@kbn/expressions-plugin/common';
import { distinctUntilChanged, merge, of, switchMap } from 'rxjs';
import { EditPanelAction } from '../actions';
import { EmbeddableInput, EmbeddableOutput, ErrorEmbeddable, IEmbeddable } from '../embeddables';

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
  const [node, setNode] = useState<ReactNode>();
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

    if (!embeddable.catchError) {
      const errorEmbeddable = new ErrorEmbeddable(error, { id: embeddable.id });
      setNode(errorEmbeddable.render());

      return () => errorEmbeddable.destroy();
    }

    const renderedNode = embeddable.catchError(error, ref.current);
    if (isFunction(renderedNode)) {
      return renderedNode;
    }
    if (isPromise(renderedNode)) {
      renderedNode.then(setNode);
    } else {
      setNode(renderedNode);
    }
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
    >
      {node}
    </EuiPanel>
  );
}
