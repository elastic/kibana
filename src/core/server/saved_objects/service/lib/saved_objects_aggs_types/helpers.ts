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

import { either } from 'fp-ts/lib/Either';
import * as rt from 'io-ts';
import { failure } from 'io-ts/lib/PathReporter';
import { get } from 'lodash';

type ErrorFactory = (message: string) => Error;

export const FieldBasicRT = rt.type({ field: rt.string });

export const throwErrors = (createError: ErrorFactory) => (errors: rt.Errors) => {
  throw createError(failure(errors).join('\n'));
};

const getProps = (codec: rt.HasProps | rt.RecordC<rt.StringC, any>): rt.Props | null => {
  if (codec == null) {
    return null;
  }
  switch (codec._tag) {
    case 'DictionaryType':
      if (codec.codomain.props != null) {
        return codec.codomain.props;
      }
      const types: rt.HasProps[] = codec.codomain.types;
      return types.reduce<rt.Props>((props, type) => Object.assign(props, getProps(type)), {});
    case 'RefinementType':
    case 'ReadonlyType':
      return getProps(codec.type);
    case 'InterfaceType':
    case 'StrictType':
    case 'PartialType':
      return codec.props;
    case 'IntersectionType':
      return codec.types.reduce<rt.Props>(
        (props, type) => Object.assign(props, getProps(type)),
        {}
      );
    default:
      return null;
  }
};

const getExcessProps = (
  props: rt.Props | rt.RecordC<rt.StringC, any>,
  r: Record<string, unknown>
): string[] =>
  Object.keys(r).reduce<string[]>((acc, k) => {
    const codecChildren = get(props, [k]);
    const childrenProps = getProps(codecChildren);
    const childrenObject = r[k] as Record<string, any>;
    if (codecChildren != null && childrenProps != null && codecChildren._tag === 'DictionaryType') {
      const keys = Object.keys(childrenObject);
      return [
        ...acc,
        ...keys.reduce<string[]>(
          (kAcc, i) => [...kAcc, ...getExcessProps(childrenProps, childrenObject[i])],
          []
        ),
      ];
    }
    if (props.hasOwnProperty(k) && childrenProps != null) {
      return [...acc, ...getExcessProps(childrenProps, childrenObject)];
    } else if (!props.hasOwnProperty(k)) {
      return [...acc, k];
    }
    return acc;
  }, []);

export const excess = (codec: rt.RecordC<rt.StringC, any>): rt.InterfaceType<rt.Props> => {
  const codecProps = getProps(codec);

  const r = new rt.DictionaryType(
    codec.name,
    codec.is,
    (u, c) =>
      either.chain(codec.validate(u, c), (o: Record<string, any>) => {
        if (codecProps == null) {
          return rt.failure(u, c, `Invalid Aggs object ${JSON.stringify(u)}`);
        }
        const keys = Object.keys(o);
        const ex = keys.reduce<string[]>((acc, k) => {
          return [...acc, ...getExcessProps(codecProps, o[k])];
        }, []);

        return ex.length > 0
          ? rt.failure(
              u,
              c,
              `Invalid value ${JSON.stringify(u)}, excess properties: ${JSON.stringify(ex)}`
            )
          : codec.validate(u, c);
      }),
    codec.encode,
    codec.domain,
    codec.codomain
  );
  return r as any;
};
