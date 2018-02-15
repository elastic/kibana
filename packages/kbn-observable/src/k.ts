import { Observable, ObservableInput } from './Observable';
import { pipeFromArray } from './lib';
import { UnaryFunction } from './interfaces';
import { $from } from './factories';

export function k$<T, R>(source: ObservableInput<T>) {
  function kOperations<A>(op1: UnaryFunction<Observable<T>, A>): A;
  function kOperations<A, B>(
    op1: UnaryFunction<Observable<T>, A>,
    op2: UnaryFunction<A, B>
  ): B;
  function kOperations<A, B, C>(
    op1: UnaryFunction<Observable<T>, A>,
    op2: UnaryFunction<A, B>,
    op3: UnaryFunction<B, C>
  ): C;
  function kOperations<A, B, C, D>(
    op1: UnaryFunction<Observable<T>, A>,
    op2: UnaryFunction<A, B>,
    op3: UnaryFunction<B, C>,
    op4: UnaryFunction<C, D>
  ): D;
  function kOperations<A, B, C, D, E>(
    op1: UnaryFunction<Observable<T>, A>,
    op2: UnaryFunction<A, B>,
    op3: UnaryFunction<B, C>,
    op4: UnaryFunction<C, D>,
    op5: UnaryFunction<D, E>
  ): E;
  function kOperations<A, B, C, D, E, F>(
    op1: UnaryFunction<Observable<T>, A>,
    op2: UnaryFunction<A, B>,
    op3: UnaryFunction<B, C>,
    op4: UnaryFunction<C, D>,
    op5: UnaryFunction<D, E>,
    op6: UnaryFunction<E, F>
  ): F;
  function kOperations<A, B, C, D, E, F, G>(
    op1: UnaryFunction<Observable<T>, A>,
    op2: UnaryFunction<A, B>,
    op3: UnaryFunction<B, C>,
    op4: UnaryFunction<C, D>,
    op5: UnaryFunction<D, E>,
    op6: UnaryFunction<E, F>,
    op7: UnaryFunction<F, G>
  ): G;
  function kOperations<A, B, C, D, E, F, G, H>(
    op1: UnaryFunction<Observable<T>, A>,
    op2: UnaryFunction<A, B>,
    op3: UnaryFunction<B, C>,
    op4: UnaryFunction<C, D>,
    op5: UnaryFunction<D, E>,
    op6: UnaryFunction<E, F>,
    op7: UnaryFunction<F, G>,
    op8: UnaryFunction<G, H>
  ): H;
  function kOperations<A, B, C, D, E, F, G, H, I>(
    op1: UnaryFunction<Observable<T>, A>,
    op2: UnaryFunction<A, B>,
    op3: UnaryFunction<B, C>,
    op4: UnaryFunction<C, D>,
    op5: UnaryFunction<D, E>,
    op6: UnaryFunction<E, F>,
    op7: UnaryFunction<F, G>,
    op8: UnaryFunction<G, H>,
    op9: UnaryFunction<H, I>
  ): I;

  function kOperations(...operations: UnaryFunction<Observable<T>, R>[]) {
    return pipeFromArray(operations)($from(source));
  }

  return kOperations;
}
