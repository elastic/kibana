# Theme Service

The `theme` service offers utilities to interact with the kibana theme. EUI provides a light and dark theme object to supplement the Elastic-Charts `baseTheme`. However, every instance of a Chart would need to pass down the correct EUI theme depending on Kibana's light or dark mode. There are several ways you can use the `theme` service to get the correct shared `theme` and `baseTheme`.

> The current theme (light or dark) of Kibana is typically taken into account for the functions below.

## `chartsDefaultBaseTheme`

Default `baseTheme` from `@elastic/charts` (i.e. light).

## `chartsDefaultTheme`

Default `theme` from `@elastic/eui` (i.e. light).

## `useChartsTheme` and `useChartsBaseTheme`

A **React hook** for simple fetching of the correct EUI `theme` and `baseTheme`.

```js
import { npStart } from 'ui/new_platform';
import { Chart, Settings } from '@elastic/charts';

export const YourComponent = () => (
  <Chart>
    <Settings
      theme={npStart.plugins.charts.theme.useChartsTheme()}
      baseTheme={npStart.plugins.charts.theme.useChartsBaseTheme()}
    />
    {/* ... */}
  </Chart>
);
```

## `chartsTheme$` and `chartsBaseTheme$`

An **`Observable`** of the current charts `theme` and `baseTheme`. Use this implementation for more flexible updates to the chart theme without full page refreshes.

```tsx
import { npStart } from 'ui/new_platform';
import { EuiChartThemeType } from '@elastic/eui/src/themes/charts/themes';
import { Subscription, combineLatest } from 'rxjs';
import { Chart, Settings, Theme } from '@elastic/charts';

interface YourComponentProps {};

interface YourComponentState {
  chartsTheme: EuiChartThemeType['theme'];
  chartsBaseTheme: Theme;
}

export class YourComponent extends Component<YourComponentProps, YourComponentState> {
  private subscriptions: Subscription[] = [];

  public state = {
    chartsTheme: npStart.plugins.charts.theme.chartsDefaultTheme,
    chartsBaseTheme: npStart.plugins.charts.theme.chartsDefaultBaseTheme,
  };

  componentDidMount() {
    this.subscription = combineLatest(
      npStart.plugins.charts.theme.chartsTheme$,
      npStart.plugins.charts.theme.chartsBaseTheme$
    ).subscribe(([chartsTheme, chartsBaseTheme]) =>
      this.setState({ chartsTheme, chartsBaseTheme })
    );
  }

  componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  public render() {
    const { chartsBaseTheme, chartsTheme } = this.state;

    return (
      <Chart>
        <Settings
          theme={chartsTheme}
          baseTheme={chartsBaseTheme}
        />
        {/* ... */}
      </Chart>
    );
  }
}
```

## Why have `theme` and `baseTheme`?

The `theme` prop is a recursive partial `Theme` that overrides properties from the `baseTheme`. This allows changes to the `Theme` TS type in `@elastic/charts` without having to update the `@elastic/eui` themes for every `<Chart />`.
