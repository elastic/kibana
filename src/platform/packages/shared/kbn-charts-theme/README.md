# @kbn/charts-theme

A temporary package to provide a hook for getting `@elastic/charts` theme based on `@elastic/eui` theme.

To be refactored to be consumed from `ElasticChartsProvider`.

```tsx
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { Chart, Settings } from '@elastic/charts';

export function MyComponent() {
  const chartBaseTheme = useElasticChartsTheme();

  return (
    <Chart>
      <Settings
        baseTheme={chartBaseTheme}
        {/* ... */}
      />
      {/* ... */}
    </Chart>
  )
}
```