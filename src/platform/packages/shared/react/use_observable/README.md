# @kbn/use-observable

React hook for subscribing to RxJS observables.

## Why this over react-use/useObservable?

- **Tearing-safe**: Uses `useSyncExternalStore` for concurrent rendering safety
- **BehaviorSubject optimized**: Reads `getValue()` synchronously to avoid initial `undefined` flash
- **Value equality optimization**: Prevents re-renders when identical values are emitted
- **Performance checks**: Warns in development when observable reference changes every render
- **Type-safe**: Strict TypeScript overloads ensure correct return types

## Usage

```tsx
import { useObservable } from '@kbn/use-observable';
import { BehaviorSubject } from 'rxjs';

// With BehaviorSubject - returns T (never undefined)
const count$ = new BehaviorSubject(0);
const count = useObservable(count$); // number

// With initial value - returns T (never undefined)
const data$ = new Subject<string>();
const data = useObservable(data$, 'initial'); // string

// Without initial value - returns T | undefined
const value = useObservable(data$); // string | undefined
```

## Performance

### Observable Reference Stability

Wrap observable creation in `useMemo()` to avoid recreating on every render:

```tsx
const filtered$ = useMemo(() => source$.pipe(filter((x) => x > 0)), [source$]);
const value = useObservable(filtered$);
```

### Value Comparison Optimization

The hook uses **strict equality** (`===`) to prevent unnecessary re-renders:

```tsx
// High-frequency observables with duplicate values
const status$ = new BehaviorSubject('idle');
status$.next('loading');
status$.next('loading'); // No re-render (same value)
status$.next('loading'); // No re-render (same value)
status$.next('success'); // Re-renders (different value)
```

If you need deep equality comparison for objects or arrays, use RxJS's `distinctUntilChanged` operator:

```tsx
import { distinctUntilChanged } from 'rxjs/operators';
import deepEqual from 'react-fast-compare';

const filtered$ = useMemo(() => source$.pipe(distinctUntilChanged(deepEqual)), [source$]);
const value = useObservable(filtered$);
```
