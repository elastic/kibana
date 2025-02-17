import { throttle, isFunction } from 'lodash';
import { useMemo } from 'react';
import useLatest from 'react-use/lib/useLatest';
import useUnmount from 'react-use/lib/useUnmount';

type Noop = (...args: any[]) => any;

export interface ThrottleOptions {
  wait?: number;
  leading?: boolean;
  trailing?: boolean;
}

export function useThrottleFn<T extends Noop>(fn: T, options?: ThrottleOptions) {
  if (!isFunction(fn)) {
    throw Error(`useThrottleFn expected parameter is a function, got ${typeof fn}`);
  }

  const fnRef = useLatest(fn);

  const wait = options?.wait ?? 1000;

  const throttled = useMemo(
    () =>
      throttle(
        (...args: Parameters<T>): ReturnType<T> => {
          return fnRef.current(...args);
        },
        wait,
        options
      ),
    [fnRef, options, wait]
  );

  useUnmount(() => {
    throttled.cancel();
  });

  return {
    run: throttled,
    cancel: throttled.cancel,
    flush: throttled.flush,
  };
}
