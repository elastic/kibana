---
description: Lens Config Builder API - Region Map
---

# Lens Config Builder API - Region Map

import Dataset from './dataset.mdx';
import Breakdown from './breakdown.mdx';

Understanding `LensRegionMapConfig` in detail

## Required Properties

### `chartType`

- **Type:** Fixed value `'regionmap'`
- **Description:** Sets the chart type to region map, which is used for displaying geographical data across different regions on a map. This visualization type is excellent for spatial analysis, showing how metrics vary across geographic locations.

### `title`

- **Type:** `string`
- **Description:** The title of the visualization.

See [Dataset configuration](dataset.md) for details on configuring the data source.

See [Breakdown configuration](breakdown.md) for details on configuring data segmentation.

## Optional Properties


## Example

```
const regionMapConfig: LensConfig = {
  chartType: 'regionmap',
  title: 'Sales by Country',
  dataset: {
    esql: 'from kibana_sample_data_logs | stats bytes=sum(bytes) by geo.dest',
  },
  breakdown: 'geo.dest',
  value: 'bytes',
};
const configBuilder = new LensConfigBuilder(dataViewsAPI, lensFormulaAPI);
const lensConfig = configBuilder.build(regionMapConfig, {
  timeRange: { from: 'now-1y', to: 'now', type: 'relative' },
  embeddable: true,
});
```
