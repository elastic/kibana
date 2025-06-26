# Theme Service

The `theme` service offers utilities to interact with the kibana theme. EUI provides a light and dark theme object to supplement the Elastic-Charts `baseTheme`. However, every instance of a Chart would need to pass down the correct EUI theme depending on Kibana's light or dark mode. There are several ways you can use the `theme` service to get the correct shared `theme` and `baseTheme`.

> The current theme (light or dark) of Kibana is typically taken into account for the functions below.

## `chartsDefaultBaseTheme`

Default `baseTheme` from `@elastic/charts` (i.e. light).

## `useChartsBaseTheme`

A **React hook** for simple fetching of the correct EUI `theme` and `baseTheme`.

```js
import { npStart } from 'ui/new_platform';
import { Chart, Settings } from '@elastic/charts';

export const YourComponent = () => (
  <Chart>
    <Settings
      theme={[chartThemeOverrides]}
      baseTheme={npStart.plugins.charts.theme.useChartsBaseTheme()}
    />
    {/* ... */}
  </Chart>
);
```

## `chartsBaseTheme$`

An **`Observable`** of the current charts `theme` and `baseTheme`. Use this implementation for more flexible updates to the chart theme without full page refreshes.

```tsx
import { npStart } from 'ui/new_platform';
import { Subscription, combineLatest } from 'rxjs';
import { Chart, Settings, Theme } from '@elastic/charts';

interface YourComponentProps {};

interface YourComponentState {
  chartsBaseTheme: Theme;
}

export class YourComponent extends Component<YourComponentProps, YourComponentState> {
  private subscriptions: Subscription[] = [];

  public state = {
    chartsBaseTheme: npStart.plugins.charts.theme.chartsDefaultBaseTheme,
  };

  componentDidMount() {
    this.subscription = combineLatest(
      npStart.plugins.charts.theme.chartsBaseTheme$
    ).subscribe(([chartsBaseTheme]) =>
      this.setState({ chartsBaseTheme })
    );
  }

  componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  public render() {
    const { chartsBaseTheme } = this.state;

    return (
      <Chart>
        <Settings baseTheme={chartsBaseTheme} />
        {/* ... */}
      </Chart>
    );
  }
}
```
