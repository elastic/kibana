import typeDetect from 'type-detect';

import { Type, TypeOptions, Any } from './type';
import { TypesError } from './utils/errors';
import { toContext } from './utils/to_context';

class UnionType<RTS extends Array<Any>, T> extends Type<T> {
  constructor(public readonly types: RTS, options?: TypeOptions<T>) {
    super(options);
  }

  process(value: any, context?: string): T {
    let errors = [];

    for (const i in this.types) {
      try {
        return this.types[i].validate(value, toContext(context, i));
      } catch (e) {
        errors.push(e);
      }
    }

    throw new TypesError(errors, 'types that failed validation', context);
  }
}

export function oneOf<A, B, C, D, E, F, G, H, I, J>(
  types: [
    Type<A>,
    Type<B>,
    Type<C>,
    Type<D>,
    Type<E>,
    Type<F>,
    Type<G>,
    Type<H>,
    Type<I>,
    Type<J>
  ],
  options?: TypeOptions<A | B | C | D | E | F | G | H | I | J>
): Type<A | B | C | D | E | F | G | H | I | J>;
export function oneOf<A, B, C, D, E, F, G, H, I>(
  types: [
    Type<A>,
    Type<B>,
    Type<C>,
    Type<D>,
    Type<E>,
    Type<F>,
    Type<G>,
    Type<H>,
    Type<I>
  ],
  options?: TypeOptions<A | B | C | D | E | F | G | H | I>
): Type<A | B | C | D | E | F | G | H | I>;
export function oneOf<A, B, C, D, E, F, G, H>(
  types: [
    Type<A>,
    Type<B>,
    Type<C>,
    Type<D>,
    Type<E>,
    Type<F>,
    Type<G>,
    Type<H>
  ],
  options?: TypeOptions<A | B | C | D | E | F | G | H>
): Type<A | B | C | D | E | F | G | H>;
export function oneOf<A, B, C, D, E, F, G>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>, Type<F>, Type<G>],
  options?: TypeOptions<A | B | C | D | E | F | G>
): Type<A | B | C | D | E | F | G>;
export function oneOf<A, B, C, D, E, F>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>, Type<F>],
  options?: TypeOptions<A | B | C | D | E | F>
): Type<A | B | C | D | E | F>;
export function oneOf<A, B, C, D, E>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>],
  options?: TypeOptions<A | B | C | D | E>
): Type<A | B | C | D | E>;
export function oneOf<A, B, C, D>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>],
  options?: TypeOptions<A | B | C | D>
): Type<A | B | C | D>;
export function oneOf<A, B, C>(
  types: [Type<A>, Type<B>, Type<C>],
  options?: TypeOptions<A | B | C>
): Type<A | B | C>;
export function oneOf<A, B>(
  types: [Type<A>, Type<B>],
  options?: TypeOptions<A | B>
): Type<A | B>;
export function oneOf<A>(types: [Type<A>], options?: TypeOptions<A>): Type<A>;
export function oneOf<RTS extends Array<Any>>(
  types: RTS,
  options?: TypeOptions<any>
): Type<any> {
  return new UnionType(types, options);
}
