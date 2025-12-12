# @kbn/use-observable

This is a better version of react-use/lib/useObservable that:

- works smoother with BehaviorSubjects (no double render on mount) and no need for initialValue
- uses useSyncExternalStore under the hood, which is the recommended way to subscribe to external data sources in React 18+
- warns if observable$ identity changes between renders, which is usually a bug
