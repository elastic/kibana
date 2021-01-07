# Application Usage

## Tracking Your Plugin Application

Application Usage is tracked automatically for each plugin by using the platform `currentAppId$` observer.

### Tracking sub views inside your application

To track a sub view inside your application (ie a flyout, a tab, form step, etc) Application Usage provides you with the tools to do so:

#### For a React Component

For tracking an application view rendered using react the simplest way is to wrap your component with the `TrackApplicationView` Higher order component:

kibana.json
```
{
  "id": "myPlugin",
  "version": "kibana",
  "server": false,
  "ui": true,
  "optionalPlugins": ["usageCollection"],
  "requiredBundles": ["usageCollection"]
}
```

Flyout component
```
import { TrackApplicationView } from 'src/plugins/usage_collection/public';

...

render() {
  return (
    <TrackApplicationView
      viewId="myFlyout"
      applicationUsageTracker={usageCollection?.applicationUsageTracker}
    >
      <MyFlyout />
    </TrackApplicationView>
  )
}
```

Application Usage will automatically track the active minutes on screen and clicks for both the application and the `MyFlyout` component whenever the component is mounted on the screen. Application Usage pauses counting screen minutes whenever the user is tabbed to another browser window.

The prop `viewId` is used as a unique identifier for your plugin. `applicationUsageTracker` can be passed directly from `usageCollection` setup or start contracts of the plugin. The Application Id is automatically attached to the tracked usage.

#### Advanced Usage

If you have a custom use case not provided by the Application Usage helpers you can use the `usageCollection.applicationUsageTracker` public api directly.

To start tracking a view: `applicationUsageTracker.trackApplicationViewUsage(viewId)`
Calling this method will marks the specified `viewId` as active. applicationUsageTracker will start tracking clicks and screen minutes for the view.

To stop tracking a view: `applicationUsageTracker.flushTrackedView(viewId)`
Calling this method will stop tracking the clicks and screen minutes for that view. Usually once the view is no longer active.


## Application Usage Telemetry Data

This collector reports the number of general clicks and minutes on screen for each registered application in Kibana.

The final payload matches the following contract:

```JSON
{
  "application_usage": {
    "application_ID": {
      "appId": "application_ID",
      "viewId": "main",
      "clicks_7_days": 10,
      "clicks_30_days": 100,
      "clicks_90_days": 300,
      "clicks_total": 600,
      "minutes_on_screen_7_days": 10.40,
      "minutes_on_screen_30_days": 20.0,
      "minutes_on_screen_90_days": 110.1,
      "minutes_on_screen_total": 112.5,
      "views": [
        {
          "appId": "application_ID",
          "viewId": "view_ID",
          "clicks_7_days": 10,
          "clicks_30_days": 20,
          "clicks_90_days": 100,
          "clicks_total": 140,
          "minutes_on_screen_7_days": 1.5,
          "minutes_on_screen_30_days": 10.0,
          "minutes_on_screen_90_days": 11.5,
          "minutes_on_screen_total": 32.5
        }
      ]
    }
  }
}
```

The view id `main` contains the total minutes on screen and clicks for the active application. The views array contains a list of all the tracked application views with the screen time and click count while the view is active.

Where `application_ID` matches the `id` registered when calling the method `core.application.register`.
This collection occurs by default for every application registered via the mentioned method and there is no need to do anything else to enable it or _opt-in_ for your plugin.

**Note to maintainers in the Kibana repo:** At the moment of writing, the `usageCollector.schema` is not updated automatically ([#70622](https://github.com/elastic/kibana/issues/70622)) so, if you are adding a new app to Kibana, you'll need to give the Kibana Telemetry team a heads up to update the mappings in the Telemetry Cluster accordingly.

## Developer notes

In order to keep the count of the events, this collector uses 3 Saved Objects:

1. `application_usage_transactional`: It stores each individually reported event. Grouped by `timestamp` and `appId`. The reason for having these documents instead of editing `application_usage_daily` documents on very report is to provide faster response to the requests to `/api/ui_counters/_report` (creating new documents instead of finding and editing existing ones) and to avoid conflicts when multiple users reach to the API concurrently.
2. `application_usage_daily`: Periodically, documents from `application_usage_transactional` are aggregated to daily summaries and deleted. Also grouped by `timestamp` and `appId` for the main view concatenated with `viewId` for other views.
3. `application_usage_totals`: It stores the sum of all the events older than 90 days old, grouped by `appId` for the main view concatenated with `viewId` for other views.

All the types use the shared fields `appId: 'keyword'`, `viewId: 'keyword'`, `numberOfClicks: 'long'` and `minutesOnScreen: 'float'`, but they are currently not added in the mappings because we don't use them for search purposes, and we need to be thoughtful with the number of mapped fields in the SavedObjects index ([#43673](https://github.com/elastic/kibana/issues/43673)). `application_usage_transactional` and `application_usage_daily` also store `timestamp: { type: 'date' }`.

Rollups uses `appId` in the savedObject id for the default view. For other views `viewId` is concatenated. This keeps backwards compatiblity with previously stored documents on the clusters without requiring any form of migration.