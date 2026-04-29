# @kbn/core-chrome-browser-mocks

Jest mocks for Core's browser-side Chrome service.

Depends only on `@kbn/core-chrome-browser-internal-types` for the `InternalChromeSetup` / `InternalChromeStart` type definitions — no dependency on `browser-internal` or `browser-components`, which avoids circular TS project reference chains.

## Exports

| Export | Description |
|---|---|
| `chromeServiceMock.create()` | Returns a deeply-mocked `ChromeService` contract (`{ setup, start, stop }`) |
| `chromeServiceMock.createSetupContract()` | Returns a deeply-mocked `InternalChromeSetup` |
| `chromeServiceMock.createStartContract()` | Returns a deeply-mocked `InternalChromeStart` with all observables pre-wired to `BehaviorSubject` / `of()` defaults |
