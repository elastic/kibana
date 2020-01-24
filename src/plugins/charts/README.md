# Charts

The Charts plugin is a way to create easier integration of shared colors, themes, types and other utilities across all Kibana charts and visualizations.

## Static methods

### `vislibColorMaps`

Color mappings related to vislib visualizations

### `truncatedColorMaps`

Color mappings subset of `vislibColorMaps`

### `colorSchemas`

Color mappings in `value`/`text` form

### `getHeatmapColors`

Funciton to retrive heatmap related colors based on `value` and `colorSchemaName`

### `truncatedColorSchemas`

Truncated color mappings in `value`/`text` form

## Theme

the `theme` service offers utilities to interact with theme of kibana. EUI provides a light and dark theme object to work with Elastic-Charts. However, every instance of a Chart would need to pass down this the correctly EUI theme depending on Kibana's light or dark mode. There are several ways you can use the `theme` service to get the correct theme.

> The current theme (light or dark) of Kibana is typically taken into account for the functions below.

### `useChartsTheme`

The simple fetching of the correct EUI theme; a **React hook**.

```js
import { npStart } from 'ui/new_platform';
import { Chart, Settings } from '@elastic/charts';

export const YourComponent = () => (
  <Chart>
    <Settings theme={npStart.plugins.charts.theme.useChartsTheme()} />
  </Chart>
);
```

### `chartsTheme$`

An **observable** of the current charts theme. Use this implementation for more flexible updates to the chart theme without full page refreshes.

```tsx
import { npStart } from 'ui/new_platform';
import { EuiChartThemeType } from '@elastic/eui/src/themes/charts/themes';
import { Subscription } from 'rxjs';
import { Chart, Settings } from '@elastic/charts';

interface YourComponentProps {};

interface YourComponentState {
  chartsTheme: EuiChartThemeType['theme'];
}

export class YourComponent extends Component<YourComponentProps, YourComponentState> {
  private subscription?: Subscription;
  public state = {
    chartsTheme: npStart.plugins.charts.theme.chartsDefaultTheme,
  };

  componentDidMount() {
    this.subscription = npStart.plugins.charts.theme
      .chartsTheme$
      .subscribe(chartsTheme => this.setState({ chartsTheme }));
  }

  componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }
  }

  public render() {
    const { chartsTheme } = this.state;

    return (
      <Chart>
        <Settings theme={chartsTheme} />
      </Chart>
    );
  }
}
```

### `chartsDefaultTheme`

Returns default charts theme (i.e. light).
