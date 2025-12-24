# @kbn/use-observable

React hook for subscribing to RxJS observables.

## Why this over react-use/useObservable?

- **Tearing-safe**: Uses `useSyncExternalStore` for concurrent rendering safety
- **BehaviorSubject optimized**: Reads `getValue()` synchronously to avoid initial `undefined` flash
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

Wrap observable creation in `useMemo()` to avoid recreating on every render:

```tsx
const filtered$ = useMemo(
  () => source$.pipe(filter(x => x > 0)),
  [source$]
);
const value = useObservable(filtered$);
```