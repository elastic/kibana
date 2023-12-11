
# @kbn/lens-embeddable-utils

## Lens Attributes Builder

 The Lens Attributes Builder is a utility for creating JSON objects used to render charts with Lens. It simplifies the process of configuring and building the necessary attributes for different chart types.

**Notes**:

This utililty is primarily used by Infra Observability UI and not meant to be used as an official solution provided by the Lens team.

- The tool has partial support of Lens charts, currently limited to XY and Metric charts.
- XY Bucket and Breakdown dimensions are limited respectively to Date Histogram and Top values.

### Usage

#### Creating a Metric Chart

To create a metric chart, use the `MetricChart` class and provide the required configuration. Here's an example:

```ts
const metricChart = new MetricChart({
  layers: new MetricLayer({
    data: {
      label: 'Disk Read Throughput',
      value: "counter_rate(max(system.diskio.read.count), kql='system.diskio.read.count: *')",
      format: {
        id: 'bytes',
        params: {
          decimals: 1,
        },
      },
    },
  }),
  dataView,
  formulaAPI
});
```

#### Creating an XY Chart

To create an XY chart, use the `XYChart` class and provide the required configuration. Here's an example:

```ts
const xyChart = new XYChart({
  layers: [new XYDataLayer({
    data: [{
      label: 'Normalized Load',
      value: "average(system.load.1) / max(system.load.cores)",
      format: {
        id: 'percent',
        params: {
          decimals: 1,
        },
      },
    }],
    options: {
      buckets: {type: 'date_histogram'},
    },
  })],
  dataView,
  formulaAPI
});
```

#### Variations of the XY Chart

XYChart has different series type variations. Here is an example of how to build a line (default) and area charts

#### Line chart

```ts
const xyChart = new XYChart({
  layers: [new XYDataLayer({
    data: [{
      label: 'Inbound (RX)',
      value: "average(system.load.1) / max(system.load.cores)",
      format: {
        id: 'percent',
        params: {
          decimals: 1,
        },
      },
      
    }],
    options: {
      buckets: {type: 'date_histogram'},
      seriesType: 'line' // default. it doesn't need to be informed.
    }
  })],
  dataView,
  formulaAPI
});
```

#### Area chart

```ts
const xyChart = new XYChart({
  layers: [new XYDataLayer({
    data: [{
      label: 'Inbound (RX)',
      value: "average(system.load.1) / max(system.load.cores)",
      format: {
        id: 'percent',
        params: {
          decimals: 1,
        },
      },
      
    }],
    options: {
      buckets: {type: 'date_histogram'},
      seriesType: 'area'
    }
  })],
  dataView,
  formulaAPI
});
```

#### Adding Multiple Layers to an XY Chart

An XY chart can have multiple layers. Here's an example of containing a Reference Line Layer:

```ts
const xyChart = new XYChart({
  layers: [
    new XYDataLayer({
      data: [{
        label: 'Disk Read Throughput',
        value: "average(system.load.1) / max(system.load.cores)",
        format: {
          id: 'percent',
          params: {
            decimals: 1,
          },
        },
      }],
      options: {
      buckets: {type: 'date_histogram'},
      },
    }),
    new XYReferenceLineLayer({
      data: [{

        value: "1",
        format: {
          id: 'percent',
          params: {
            decimals: 1,
          },
        },
      }],
    }),
  ],
  dataView,
  formulaAPI
});
```

#### Adding Multiple Data Sources in the Same Layer

In an XY chart, it's possible to define multiple data sources within the same layer.

To configure multiple data sources in an XY data layer, simply provide an array of data to the same YXDataLayer class:

```ts
const xyChart = new XYChart({
  layers: new YXDataLayer({
    data: [{
      label: 'RX',
      value: "average(host.network.ingress.bytes) * 8 / (max(metricset.period, kql='host.network.ingress.bytes: *') / 1000)",
      format: {
        id: 'bits',
        params: {
          decimals: 1,
        },
      },
    },{
      label: 'TX',
      value: "(average(host.network.egresss.bytes) * 8 / (max(metricset.period, kql='host.network.egresss.bytes: *') / 1000)",
      format: {
        id: 'bits',
        params: {
          decimals: 1,
        },
      },
    }],
    options: {
      buckets: {type: 'date_histogram'},
    },
  }),
  dataView,
  formulaAPI
});
```

#### Building Lens Chart Attributes

The `LensAttributesBuilder` is responsible for creating the full JSON object that combines the attributes returned by the chart classes. Here's an example:

```ts
const builder = new LensAttributesBuilder({ visualization: xyChart });
const attributes = builder.build();
```

The `attributes` object contains the final JSON representation of the chart configuration and can be used to render the chart with Lens.

### Usage with Lens EmbeddableComponent

To display the charts rendered with the Lens Attributes Builder, it's recommended to use the Lens `EmbeddableComponent`. The `EmbeddableComponent` abstracts some of the chart styling and other details that would be challenging to handle directly with the Lens Attributes Builder.

```tsx
const builder = new LensAttributesBuilder({
  visualization: new MetricChart({
    layers: new MetricLayer({
      data: {
        label: 'Disk Read Throughput',
        value: "counter_rate(max(system.diskio.read.count), kql='system.diskio.read.count: *')",
        format: {
          id: 'bytes',
          params: {
            decimals: 1,
          },
        },
      },
    }),
    dataView,
    formulaAPI
  }),
});

const lensAttributes = builder.build();

<EmbeddableComponent
  attributes={lensAttributes}
  viewMode={ViewMode.VIEW}
  ...
/>
```