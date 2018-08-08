# kbn-internal-native-observable

This package contains a [spec-compliant][spec] observable implementation that
does _not_ implement any additional helper methods on the observable.

NB! It is not intended to be used directly. It is exposed through
`../kbn-observable`, which also exposes several helpers, similar to a subset of
features in RxJS.

## Background

We only want to expose native JavaScript observables in the api, i.e. exposed
observables should _only_ implement the specific methods defined in the spec.
The primary reason for doing this is that we don't want to couple our plugin
api to a specific version of RxJS (or any other observable library that
implements additional methods on top of the spec).

As there exists no other library we can use in the interim while waiting for the
Observable spec to reach stage 3, all exposed observables in the Kibana platform
should rely on this package.

## Why a separate package?

This package is implemented as a separate package instead of directly in the
platform code base for a couple of reasons. We wanted to copy the
implementation from the [observable proposal][spec] directly (so it's easier to
stay up-to-date with the future spec), and we therefore didn't want to start
adding TS types directly to that implementation.

We tried to avoid this by implementing the type declaration file separately and
make that part of the build. However, to handle the JS file we would have to
enable the `allowJs` TypeScript compiler option, which doesn't yet play nicely
with the automatic building of declaration files we do in the `kbn-types`
package.

The best solution we found in the end was to extract this as a separate package
and specify the `types` field in the `package.json`. Then everything works out
of the box.

There is no other reasons for this to be a separate package, so if we find a
solution to the above we should consider inlining this implementation into the
platform.

[spec]: https://github.com/tc39/proposal-observable
