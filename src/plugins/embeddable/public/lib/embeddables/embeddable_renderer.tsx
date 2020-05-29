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
import { ErrorEmbeddable } from './error_embeddable';

/**
 * This type is needed for strict public api
 */
export type EmeddableRendererProps<I extends EmbeddableInput> =
  | { input: I; factory: EmbeddableFactory<I> }
  | { input: I; embeddable: IEmbeddable<I> };

/**
 * This one is for internal implementation
 */
interface InnerProps {
  input: EmbeddableInput;
  factory?: EmbeddableFactory;
  embeddable?: IEmbeddable;
}

export const EmbeddableRenderer = <I extends EmbeddableInput>(
  publicProps: EmeddableRendererProps<I>
) => {
  const props = publicProps as InnerProps;
  const [embeddable, setEmbeddable] = useState<IEmbeddable | undefined>(props.embeddable);
  const [loading, setLoading] = useState<boolean>(!props.embeddable);
  const [error, setError] = useState<string | undefined>();
  const latestInput = React.useRef(props.input);
  useEffect(() => {
    latestInput.current = props.input;
  }, [props.input]);

  useEffect(() => {
    let canceled = false;
    if (props.embeddable) {
      setEmbeddable(props.embeddable);
      return;
    }

    // keeping track of embeddables created by this component to be able to destroy them
    let createdEmbeddableRef: IEmbeddable | ErrorEmbeddable | undefined;
    if (props.factory) {
      setEmbeddable(undefined);
      setLoading(true);
      props.factory
        .create(latestInput.current)
        .then((createdEmbeddable) => {
          if (canceled) {
            if (createdEmbeddable) {
              createdEmbeddable.destroy();
            }
          }
          createdEmbeddableRef = createdEmbeddable;
          setEmbeddable(createdEmbeddable);
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
  }, [props.factory, props.embeddable]);

  return (
    <EmbeddableRoot embeddable={embeddable} loading={loading} error={error} input={props.input} />
  );
};
