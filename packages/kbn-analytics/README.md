# kbn-analytics

kbn-analytics
- reporting methods
- batch logic
- sending to API


Telemetry plugin
- API endpoint
- saving to saved objects
- collector logic
- exposes kbn-analytics reporting methods
- provide http method to kbn-analytics


Kibana plugins
- require Telemetry as optional dep
- use reporting methods in browser to report user interactions



### Metrics

#### Stats Metrics

#### Performance Metrics


### Batching

submit report -> save into localstorage -> flush every interval



### Mappings


{
  "ui-metric": {
    "properties": {
      "count": {
        "type": "integer"
      }
    }
  }
}



storageMapping:
{
  appName: {
    `count|loaded|click`: [{ eventName, stats: { sum, min, avg, max } }],
    'navigation': [{ eventName, navigationEntries }]
  }
}



telemertyMapping:
```
{
  # stats = { sum, avg, min, max }
  analytics:  {
    statsMetrics: [{
      # metricType = count | loaded | click
      key: `${appName-mericType-eventName},
      appName: appName,
      eventName: evenName,
      type: metricType,
      stats: stats
    }],
    performance: {
      navigation: [{
        key: `${appName-navigate}`,
        appName: appName,
        connectEnd: stats,
        connectStart: stats,
        decodedBodySize: stats,
        domComplete: stats,
        domContentLoadedEventEnd: stats,
        domContentLoadedEventStart: stats,
        domInteractive: stats,
        domainLookupEnd: stats,
        domainLookupStart: stats,
        duration: stats,
        encodedBodySize: stats,
        fetchStart: stats,
        initiatorType: stats,
        loadEventEnd: stats,
        loadEventStart: stats,
        nextHopProtocol: stats,
        redirectCount: stats,
        redirectEnd: stats,
        redirectStart: stats,
        requestStart: stats,
        responseEnd: stats,
        responseStart: stats,
        secureConnectionStart: stats,
        serverTiming: stats,
        startTime: stats,
        transferSize: stats,
        unloadEventEnd: stats,
        unloadEventStart: stats,
        workerStart: stats,
      }],
    },
  }
}
```