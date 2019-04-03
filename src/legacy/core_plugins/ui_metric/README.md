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

To track a user interaction, simply send a `POST` request to `/api/ui_metric/{APP_NAME}/{ACTION_NAME}`,
where `APP_MAME` and `ACTION_NAME` are underscore-delimited strings, e.g. `my_app` and `my_action`.

That's all you need to do!

### Tracking timed interactions

If you want to track how long it takes a user to do something, you'll need to implement the timing
logic yourself. You'll also need to predefine some buckets into which the UI metric can fall.
For example, if you're timing how long it takes to create a visualization, you may decide to
measure interactions that take less than 1 minute, 1-5 minutes, 5-20 minutes, and longer than 20 minutes.
To track these interactions, you'd use the timed length of the interaction to determine whether to
hit `/api/ui_metric/visualize/create_vis_1m`, `/api/ui_metric/visualize/create_vis_5m`,
`/api/ui_metric/visualize/create_vis_20m`, etc.

## How it works

Under the hood, your app and action will be stored in a saved object of type `user-metric` and the
ID `my_app:my_action`. This saved object will have a `count` property which will be incremented every
time the above URI is hit.

These saved objects are automatically consumed by the stats API and surfaced under the
`ui_metric` namespace.

```json
{
  "ui_metric":{
    "my_app":[
      {
        "key":"my_action",
        "value":3
      }
    ]
  }
}
```

By storing these actions and their counts as key-value pairs, we can add more actions without having
to worry about exceeding the 1000-field soft limit in Elasticsearch.