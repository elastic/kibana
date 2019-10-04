# EuiUtils

The EuiUtils plugin is a way to create easier integration of EUI colors, themes, and other utilities with Kibana. They usually take into account the current theme (light or dark) of Kibana and return the correct object that was asked for.

## EUI plus Elastic-Charts

EUI provides a light and dark theme object to work with Elastic-Charts. However, every instance of a Chart would need to pass down this the correctly EUI theme depending on Kibana's light or dark mode. There are several ways you can use EuiUtils to grab the correct theme.

### `useChartsTheme`

The simple fetching of the correct EUI theme; a **React hook**.

```js
import { npStart } from 'ui/new_platform';
import { Chart, Settings } from '@elastic/charts';

export const YourComponent = () => (
  <Chart>
    <Settings theme={npStart.plugins.eui_utils.useChartsTheme()} />
  </Chart>
);
```

### `getChartsTheme$`

An **observable** of the current charts theme. Use this implementation for more flexible updates to the chart theme without full page refreshes.

```ts
import { npStart } from 'ui/new_platform';
import { EuiChartThemeType } from '@elastic/eui/src/themes/charts/themes';
import { Subscription } from 'rxjs';
import { Chart, Settings } from '@elastic/charts';

interface YourComponentState {
  chartsTheme: EuiChartThemeType['theme'];
}

export class YourComponent extends Component<YourComponentProps, YourComponentState> {
  private subscription?: Subscription;
  public state = {
    chartsTheme: npStart.plugins.eui_utils.getChartsThemeDefault(),
  };

  componentDidMount() {
    this.subscription = npStart.plugins.eui_utils
      .getChartsTheme$()
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
