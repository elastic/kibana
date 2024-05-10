/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { EmbeddableInput, IEmbeddable } from './i_embeddable';
import { EmbeddableRoot } from './embeddable_root';
import { EmbeddableFactory } from './embeddable_factory';
import { ErrorEmbeddable } from './error_embeddable';
import { isErrorEmbeddable } from './is_error_embeddable';

/**
 * This type is a publicly exposed props of {@link EmbeddableRenderer}
 * Union is used to validate that or factory or embeddable is passed in, but it can't be both simultaneously
 * In case when embeddable is passed in, input is optional, because there is already an input inside of embeddable object
 * In case when factory is used, then input is required, because it will be used as initial input to create an embeddable object
 */
export type EmbeddableRendererProps<I extends EmbeddableInput> =
  | EmbeddableRendererPropsWithEmbeddable<I>
  | EmbeddableRendererWithFactory<I>;

interface EmbeddableRendererPropsWithEmbeddable<I extends EmbeddableInput> {
  input?: I;
  onInputUpdated?: (newInput: I) => void;
  embeddable: IEmbeddable<I>;
}

interface EmbeddableRendererWithFactory<I extends EmbeddableInput> {
  input: I;
  onInputUpdated?: (newInput: I) => void;
  factory: EmbeddableFactory<I>;
}

function isWithFactory<I extends EmbeddableInput>(
  props: EmbeddableRendererProps<I>
): props is EmbeddableRendererWithFactory<I> {
  return 'factory' in props;
}

export function useEmbeddableFactory<I extends EmbeddableInput>({
  input,
  factory,
  onInputUpdated,
}: EmbeddableRendererWithFactory<I>) {
  const [embeddable, setEmbeddable] = useState<IEmbeddable<I> | ErrorEmbeddable | undefined>(
    undefined
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>();
  const latestInput = React.useRef(input);
  useEffect(() => {
    latestInput.current = input;
  }, [input]);

  useEffect(() => {
    let canceled = false;

    // keeping track of embeddables created by this component to be able to destroy them
    let createdEmbeddableRef: IEmbeddable | ErrorEmbeddable | undefined;
    setEmbeddable(undefined);
    setLoading(true);
    factory
      .create(latestInput.current!)
      .then((createdEmbeddable) => {
        if (canceled) {
          if (createdEmbeddable) {
            createdEmbeddable.destroy();
          }
        } else {
          createdEmbeddableRef = createdEmbeddable;
          setEmbeddable(createdEmbeddable);
        }
      })
      .catch((err) => {
        if (canceled) return;
        setError(err?.message);
      })
      .finally(() => {
        if (canceled) return;
        setLoading(false);
      });

    return () => {
      canceled = true;
      if (createdEmbeddableRef) {
        createdEmbeddableRef.destroy();
      }
    };
  }, [factory]);

  useEffect(() => {
    if (!embeddable) return;
    if (isErrorEmbeddable(embeddable)) return;
    if (!onInputUpdated) return;
    const sub = embeddable.getInput$().subscribe((newInput) => {
      onInputUpdated(newInput);
    });
    return () => {
      sub.unsubscribe();
    };
  }, [embeddable, onInputUpdated]);

  return [embeddable, loading, error] as const;
}

/**
 * Helper react component to render an embeddable
 * Can be used if you have an embeddable object or an embeddable factory
 * Supports updating input by passing `input` prop
 *
 * @remarks
 * This component shouldn't be used inside an embeddable container to render embeddable children
 * because children may lose inherited input, here is why:
 *
 * When passing `input` inside a prop, internally there is a call:
 *
 * ```ts
 * embeddable.updateInput(input);
 * ```
 * If you are simply rendering an embeddable, it's no problem.
 *
 * However when you are dealing with containers,
 * you want to be sure to only pass into updateInput the actual state that changed.
 * This is because calling child.updateInput({ foo }) will make foo explicit state.
 * It cannot be inherited from it's parent.
 *
 * For example, on a dashboard, the time range is inherited by all children,
 * unless they had their time range set explicitly.
 * This is how "per panel time range" works.
 * That action calls embeddable.updateInput({ timeRange }),
 * and the time range will no longer be inherited from the container.
 *
 * see: https://github.com/elastic/kibana/pull/67783#discussion_r435447657 for more details.
 * refer to: examples/embeddable_explorer for examples with correct usage of this component.
 *
 * @public
 * @param props - {@link EmbeddableRendererProps}
 */
export const EmbeddableRenderer = <I extends EmbeddableInput>(
  props: EmbeddableRendererProps<I>
) => {
  if (isWithFactory(props)) {
    return <EmbeddableByFactory {...props} />;
  }
  return <EmbeddableRoot embeddable={props.embeddable} input={props.input} />;
};

//
const EmbeddableByFactory = <I extends EmbeddableInput>({
  factory,
  input,
  onInputUpdated,
}: EmbeddableRendererWithFactory<I>) => {
  const [embeddable, loading, error] = useEmbeddableFactory({
    factory,
    input,
    onInputUpdated,
  });
  return <EmbeddableRoot embeddable={embeddable} loading={loading} error={error} input={input} />;
};
