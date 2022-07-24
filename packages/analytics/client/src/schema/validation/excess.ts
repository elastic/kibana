/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Extra IO-TS type to not allow more keys than the defined ones.
// Extracted from https://github.com/gcanti/io-ts/issues/322

import * as t from 'io-ts';
import { either, Either, isRight, left, right, Right } from 'fp-ts/lib/Either';

const getIsCodec =
  <T extends t.Any>(tag: string) =>
  (codec: t.Any): codec is T =>
    (codec as t.Any & { _tag: string })._tag === tag;

const isInterfaceCodec = getIsCodec<t.InterfaceType<t.Props>>('InterfaceType');
const isPartialCodec = getIsCodec<t.PartialType<t.Props>>('PartialType');
const isIntersectionType = getIsCodec<t.IntersectionType<t.Mixed[]>>('IntersectionType');

const getProps = (codec: t.HasProps): t.Props => {
  switch (codec._tag) {
    case 'RefinementType':
    case 'ReadonlyType':
      return getProps(codec.type);
    case 'InterfaceType':
    case 'StrictType':
    case 'PartialType':
      return codec.props;
    case 'IntersectionType':
      return codec.types.reduce<t.Props>((props, type) => Object.assign(props, getProps(type)), {});
  }
};

const getNameFromProps = (props: t.Props, isPartial: boolean): string =>
  Object.keys(props)
    .map((k) => `${k}${isPartial ? '?' : ''}: ${props[k].name}`)
    .join(', ');

/**
 * Provides a human-readable definition of the io-ts validator.
 * @param codec The io-ts declaration passed as an argument to the Excess method.
 * @remarks Since we currently use it only with objects, we'll cover the IntersectionType and PartialType
 */
const getExcessTypeName = (codec: t.Any): string => {
  if (isIntersectionType(codec)) {
    return `{ ${codec.types
      .map((subCodec) => {
        if (isInterfaceCodec(subCodec)) {
          return getNameFromProps(subCodec.props, false);
        }
        if (isPartialCodec(subCodec)) {
          return getNameFromProps(subCodec.props, true);
        }
        return subCodec.name;
      })
      .filter(Boolean)
      .join(', ')} }`;
  }
  return `Excess<${codec.name}>`;
};

const stripKeys = <T>(o: T, props: t.Props): Either<string[], T> => {
  const keys = Object.getOwnPropertyNames(o);
  const propsKeys = Object.getOwnPropertyNames(props);

  propsKeys.forEach((pk) => {
    const index = keys.indexOf(pk);
    if (index !== -1) {
      keys.splice(index, 1);
    }
  });

  return keys.length ? left(keys) : right(o);
};

/**
 * Validate if there are any keys that exist in the validated object, but they don't in the validation object.
 * @param codec The io-ts schema to wrap with this validation
 * @param name (optional) Replace the custom logic to name the validation error by providing a static name.
 */
export const excess = <C extends t.HasProps>(
  codec: C,
  name: string = getExcessTypeName(codec)
): ExcessType<C> => {
  const props: t.Props = getProps(codec);
  return new ExcessType<C>(
    name,
    (u): u is C => isRight(stripKeys(u, props)) && codec.is(u),
    (u, c) =>
      either.chain(t.UnknownRecord.validate(u, c), () =>
        either.chain(codec.validate(u, c), (a) =>
          either.mapLeft(stripKeys<C>(a, props), (keys) =>
            keys.map((k) => ({
              value: a[k],
              context: c,
              message: `excess key '${k}' found`,
            }))
          )
        )
      ),
    (a) => codec.encode((stripKeys(a, props) as Right<any>).right),
    codec
  );
};

class ExcessType<C extends t.Any, A = C['_A'], O = A, I = unknown> extends t.Type<A, O, I> {
  public readonly _tag: 'ExcessType' = 'ExcessType';
  constructor(
    name: string,
    is: ExcessType<C, A, O, I>['is'],
    validate: ExcessType<C, A, O, I>['validate'],
    encode: ExcessType<C, A, O, I>['encode'],
    public readonly type: C
  ) {
    super(name, is, validate, encode);
  }
}
