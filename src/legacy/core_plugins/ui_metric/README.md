# UI Metric app

## Purpose

The purpose of the UI Metric app is to provide a tool for gathering data on how users interact with
various UIs within Kibana. It's useful for gathering _aggregate_ information, e.g. "How many times
has Button X been clicked" or "How many times has Page Y been viewed".

With some finagling, it's even possible to add more meaning to the info you gather, such as "How many
visualizations were created in less than 5 minutes".

### What it doesn't do

The UI Metric app doesn't gather any metadata around a user interaction, e.g. the user's identity,
the name of a dashboard they've viewed, or the timestamp of the interaction.

## How to use it

To track a user interaction, import the `createUiStatsReporter` helper function from UI Metric app:

```js
import { createUiStatsReporter, METRIC_TYPE } from 'relative/path/to/src/legacy/core_plugins/ui_metric/public';
const trackMetric = createUiStatsReporter(`<AppName>`);
trackMetric(METRIC_TYPE.CLICK, `<EventName>`);
trackMetric('click', `<EventName>`);
```

Metric Types:
  - `METRIC_TYPE.CLICK` for tracking clicks `trackMetric(METRIC_TYPE.CLICK, 'my_button_clicked');`
  - `METRIC_TYPE.LOADED` for a component load or page load `trackMetric(METRIC_TYPE.LOADED', 'my_component_loaded');`
  - `METRIC_TYPE.COUNT` for a tracking a misc count `trackMetric(METRIC_TYPE.COUNT', 'my_counter', <count> });`

Call this function whenever you would like to track a user interaction within your app. The function
accepts two arguments, `metricType` and `eventNames`. These should be underscore-delimited strings.
For example, to track the `my_event` metric in the app `my_app` call `trackUiMetric(METRIC_TYPE.*, 'my_event)`.

That's all you need to do!

To track multiple metrics within a single request, provide an array of events, e.g. `trackMetric(METRIC_TYPE.*, ['my_event1', 'my_event2', 'my_event3'])`.

### Disallowed characters

The colon character (`:`) should not be used in app name or event names. Colons play
a special role in how metrics are stored as saved objects.

### Tracking timed interactions

If you want to track how long it takes a user to do something, you'll need to implement the timing
logic yourself. You'll also need to predefine some buckets into which the UI metric can fall.
For example, if you're timing how long it takes to create a visualization, you may decide to
measure interactions that take less than 1 minute, 1-5 minutes, 5-20 minutes, and longer than 20 minutes.
To track these interactions, you'd use the timed length of the interaction to determine whether to
use a `eventName` of  `create_vis_1m`, `create_vis_5m`, `create_vis_20m`, or `create_vis_infinity`.

## How it works

Under the hood, your app and metric type will be stored in a saved object of type `user-metric` and the
ID `ui-metric:my_app:my_metric`. This saved object will have a `count` property which will be incremented 
every time the above URI is hit.

These saved objects are automatically consumed by the stats API and surfaced under the
`ui_metric` namespace.

```json
{
  "ui_metric": {
    "my_app": [
      {
        "key": "my_metric",
        "value": 3
      }
    ]
  }
}
```

By storing these metrics and their counts as key-value pairs, we can add more metrics without having
to worry about exceeding the 1000-field soft limit in Elasticsearch.