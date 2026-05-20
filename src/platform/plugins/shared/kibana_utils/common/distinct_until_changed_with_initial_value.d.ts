import type { MonoTypeOperatorFunction } from 'rxjs';
export declare function distinctUntilChangedWithInitialValue<T>(initialValue: T | Promise<T>, compare?: (x: T, y: T) => boolean): MonoTypeOperatorFunction<T>;
