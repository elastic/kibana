# unifiedHistogram

Unified Histogram is a UX Building Block including a layout with a resizable histogram and a main display.
It manages its own state and data fetching, and can easily be dropped into pages with minimal setup.

## Example

```tsx
// Import the container component and API contract
import {
  UnifiedHistogramContainer,
  type UnifiedHistogramInitializedApi,
} from '@kbn/unified-histogram-plugin/public';

// Import modules required for your application
import {
  useServices,
  useResizeRef,
  useCallbacks,
  useRequestParams,
  useManualRefetch,
  MyLayout,
  MyButton,
} from './my-modules';

const services = useServices();
const resizeRef = useResizeRef();
const { onChartHiddenChange, onLensRequestAdapterChange } = useCallbacks();
const {
  dataView,
  query,
  filters,
  timeRange,
  searchSessionId,
  requestAdapter,
} = useRequestParams();

// Use a state variable instead of a ref to preserve reactivity when the API is updated
const [unifiedHistogram, setUnifiedHistogram] = useState<UnifiedHistogramInitializedApi>();

// Create a callback to set unifiedHistogram, and initialize it if needed
const setUnifiedHistogramApi = useCallback((api: UnifiedHistogramApi | null) => {
  // Ignore if the ref is null
  if (!api) {
    return;
  }

  if (api.initialized) {
    // Update our local reference to the API
    setUnifiedHistogram(api);
  } else {
    // Initialize if not yet initialized
    api.initialize({
      // Pass the required services to Unified Histogram
      services,
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
      // If passing an absolute time range, provide a function to get the relative range
      getRelativeTimeRange: services.data.query.timefilter.timefilter.getTime,
      // At minimum the initial state requires a data view, but additional
      // parameters can be passed to further customize the state
      initialState: {
        dataView,
        query,
        filters,
        timeRange,
        searchSessionId,
        requestAdapter,
      },
    });
  }
}, [...]);

// Manually refetch if disableAutoFetching is true
useManualRefetch(() => {
  unifiedHistogram?.refetch();
});

// Update the Unified Histogram state when our request params change
useEffect(() => {
  unifiedHistogram?.setRequestParams({
    dataView,
    query,
    filters,
    timeRange,
    searchSessionId,
    requestAdapter,
  });
}, [...]);

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
    ref={setUnifiedHistogramApi}
    // Pass a ref to the containing element to
    // handle top panel resize functionality
    resizeRef={resizeRef}
    // Optionally append an element after the
    // hits counter display
    appendHitsCounter={<MyButton />}
  >
    <MyLayout />
  </UnifiedHistogramContainer>
);
```
