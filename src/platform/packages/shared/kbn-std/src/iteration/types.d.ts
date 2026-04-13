import type { ObservableInput } from 'rxjs';
export type IterableInput<T> = Iterable<T> | ObservableInput<T>;
export type AsyncMapResult<T> = Promise<T> | ObservableInput<T>;
export type AsyncMapFn<T1, T2> = (item: T1, i: number) => AsyncMapResult<T2>;
