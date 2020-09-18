/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useEffect, useState } from 'react';
import { EmbeddableInput, IEmbeddable } from './i_embeddable';
import { EmbeddableRoot } from './embeddable_root';
import { EmbeddableFactory } from './embeddable_factory';
import { ErrorEmbeddable, isErrorEmbeddable } from './error_embeddable';

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

function isWithEmbeddable<I extends EmbeddableInput>(
  props: EmbeddableRendererProps<I>
): props is EmbeddableRendererPropsWithEmbeddable<I> {
  return 'embeddable' in props;
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
  const { input, onInputUpdated } = props;
  const [embeddable, setEmbeddable] = useState<IEmbeddable<I> | ErrorEmbeddable | undefined>(
    isWithEmbeddable(props) ? props.embeddable : undefined
  );
  const [loading, setLoading] = useState<boolean>(!isWithEmbeddable(props));
  const [error, setError] = useState<string | undefined>();
  const latestInput = React.useRef(props.input);
  useEffect(() => {
    latestInput.current = input;
  }, [input]);

  const factoryFromProps = isWithFactory(props) ? props.factory : undefined;
  const embeddableFromProps = isWithEmbeddable(props) ? props.embeddable : undefined;
  useEffect(() => {
    let canceled = false;
    if (embeddableFromProps) {
      setEmbeddable(embeddableFromProps);
      return;
    }

    // keeping track of embeddables created by this component to be able to destroy them
    let createdEmbeddableRef: IEmbeddable | ErrorEmbeddable | undefined;
    if (factoryFromProps) {
      setEmbeddable(undefined);
      setLoading(true);
      factoryFromProps
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
    }

    return () => {
      canceled = true;
      if (createdEmbeddableRef) {
        createdEmbeddableRef.destroy();
      }
    };
  }, [factoryFromProps, embeddableFromProps]);

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

  return <EmbeddableRoot embeddable={embeddable} loading={loading} error={error} input={input} />;
};
