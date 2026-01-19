# @kbn/chart-test-jest-helpers

This package provides utilities for testing Elastic Charts components with Jest and React Testing Library.

## Included Helpers

### render_chart.tsx
- **renderChart**: An async helper to render a chart component and verify it completes rendering.
  - Optionally enables the Elastic Charts debug flag for test introspection.
  - Renders the chart and waits for the `renderComplete` callback to be called.
  - Extracts and parses the chart's debug state from the DOM for further assertions (if debug is enabled).
  - Useful for verifying chart rendering and inspecting chart state in tests.

### chart_testing_utilities.ts
- **ResizeObserverMock**: A minimal mock for the browser's `ResizeObserver` API
  - Ensures Elastic Charts components receive a resize event, which is required to bootstrap rendering in tests.
  - Returns a fixed size (500x500) for the observed element.
- **setupResizeObserverMock / cleanResizeObserverMock**: Functions to install and restore the mock `ResizeObserver` globally.
  - Call `setupResizeObserverMock()` before your chart tests to enable the mock.
  - Call `cleanResizeObserverMock()` after tests to restore the original observer.

## Usage Example

```typescript
import {
  setupResizeObserverMock,
  cleanResizeObserverMock,
  renderChart,
} from '@kbn/chart-test-jest-helpers';

beforeAll(() => setupResizeObserverMock());
afterAll(() => cleanResizeObserverMock());

it('renders chart and exposes debug state', async () => {
  const props = { renderComplete: jest.fn(), ...otherProps };
  const { component, debugState } = await renderChart(props, MyChartComponent, true);
  expect(debugState).toBeDefined();
});
```

