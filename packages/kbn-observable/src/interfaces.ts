import { Observable } from './observable';

export type UnaryFunction<T, R> = (source: T) => R;

export type OperatorFunction<T, R> = UnaryFunction<
  Observable<T>,
  Observable<R>
>;

export type MonoTypeOperatorFunction<T> = OperatorFunction<T, T>;
