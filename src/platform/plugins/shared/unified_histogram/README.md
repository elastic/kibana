# unifiedHistogram

Unified Histogram is a UX Building Block including a layout with a resizable histogram and a main display.
It manages its own state and data fetching, and can easily be dropped into pages with minimal setup.

## Basic Usage

```tsx
// Import the container component
import {
  UnifiedHistogramContainer,
} from '@kbn/unified-histogram-plugin/public';

// Import modules required for your application
import {
  useServices,
  useResizeRef,
  useRequestParams,
  MyLayout,
  MyButton,
} from './my-modules';

const services = useServices();
const resizeRef = useResizeRef();
const {
  dataView,
  query,
  filters,
  timeRange,
  relativeTimeRange,
  searchSessionId,
  requestAdapter,
} = useRequestParams();

return (
  <UnifiedHistogramContainer
    // Pass the required services to Unified Histogram
    services={services}
    // Pass request parameters to Unified Histogram
    dataView={dataView}
    query={query}
    filters={filters}
    timeRange={timeRange}
    // If the provided timeRange is an absolute range,
    // a relativeTimeRange should also be provided
    relativeTimeRange={relativeTimeRange}
    searchSessionId={searchSessionId}
    requestAdapter={requestAdapter}
    // Pass a ref to the containing element to
    // handle top panel resize functionality
    resizeRef={resizeRef}
  >
    <MyLayout />
  </UnifiedHistogramContainer>
);
```

## Advanced Usage

```tsx
// Import the container component and API contract
import {
  UnifiedHistogramContainer,
  type UnifiedHistogramApi,
} from '@kbn/unified-histogram-plugin/public';

// Import modules required for your application
import {
  useServices,
  useResizeRef,
  useCallbacks,
  useRequestParams,
  useStateParams,
  useManualRefetch,
  MyLayout,
  MyButton,
} from './my-modules';

const services = useServices();
const resizeRef = useResizeRef();
const { onChartHiddenChange, onLensRequestAdapterChange } = useCallbacks();
const { chartHidden, breakdownField } = useStateParams();
const {
  dataView,
  query,
  filters,
  timeRange,
  relativeTimeRange,
  searchSessionId,
  requestAdapter,
} = useRequestParams();

// Use a state variable instead of a ref to preserve reactivity when the API is updated
const [unifiedHistogram, setUnifiedHistogram] = useState<UnifiedHistogramApi>();

const getCreationOptions = useCallback(() => ({
  // Optionally provide a local storage key prefix to save parts of the state,
  // such as the chart hidden state and top panel height, to local storage
  localStorageKeyPrefix: 'myApp',
  // By default Unified Histogram will automatically refetch based on certain
  // state changes, such as chart hidden and request params, but this can be
  // disabled in favour of manual fetching if preferred. Note that an initial
  // request is always triggered when first initialized, and when the chart
  // changes from hidden to visible, Lens will automatically trigger a refetch
  // regardless of what this property is set to
  disableAutoFetching: true,
  // Customize the initial state in order to override the defaults
  initialState: { chartHidden, breakdownField },
}), [...]);

// Manually refetch if disableAutoFetching is true
useManualRefetch(() => {
  unifiedHistogram?.refetch();
});

// Update the Unified Histogram state when our state params change
useEffect(() => {
  unifiedHistogram?.setChartHidden(chartHidden);
}, [chartHidden]);

useEffect(() => {
  unifiedHistogram?.setBreakdownField(breakdownField);
}, [breakdownField]);

// Listen for state changes if your application requires it
useEffect(() => {
  const subscription = unifiedHistogram?.state$
    .pipe(map((state) => state.chartHidden), distinctUntilChanged())
    .subscribe(onChartHiddenChange);

  return () => {
    subscription?.unsubscribe();
  };
}, [...]);

// Currently Lens does not accept a custom request adapter,
// so it will not use the one passed to Unified Histogram.
// Instead you can get access to the one it's using by
// listening for state changes
useEffect(() => {
  const subscription = unifiedHistogram?.state$
    .pipe(map((state) => state.lensRequestAdapter), distinctUntilChanged())
    .subscribe(onLensRequestAdapterChange);

  return () => {
    subscription?.unsubscribe();
  };
}, [...]);

return (
  <UnifiedHistogramContainer
    // Pass the ref callback to receive the API
    ref={setUnifiedHistogram}
    // Pass getCreationOptions to customize initialization
    getCreationOptions={getCreationOptions}
    services={services}
    dataView={dataView}
    query={query}
    filters={filters}
    timeRange={timeRange}
    relativeTimeRange={relativeTimeRange}
    searchSessionId={searchSessionId}
    requestAdapter={requestAdapter}
    resizeRef={resizeRef}
  >
    <MyLayout />
  </UnifiedHistogramContainer>
);
```
