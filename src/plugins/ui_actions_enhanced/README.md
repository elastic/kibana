# `ui_actions_enhanced`

Registers commercially licensed generic actions like per panel time range and contains some code that supports drilldown work.

- [__Dashboard drilldown user docs__](https://www.elastic.co/guide/en/kibana/master/drilldowns.html)

## Dynamic Actions Telemetry

Dynamic actions (drilldowns) report telemetry. Below is the summary of dynamic action metrics that are reported using telemetry.

### Dynamic action count

Total count of dynamic actions (drilldowns) on a saved object.

```
dynamicActions.count
```

### Count by factory ID

Count of active dynamic actions (drilldowns) on a saved object by factory ID (drilldown type).

```
dynamicActions.actions.<factory_id>.count
```

For example:

```
dynamicActions.actions.DASHBOARD_TO_DASHBOARD_DRILLDOWN.count
dynamicActions.actions.URL_DRILLDOWN.count
```

### Count by trigger

Count of active dynamic actions (drilldowns) on a saved object by a trigger to which they are attached.

```
dynamicActions.triggers.<trigger>.count
```

For example:

```
dynamicActions.triggers.VALUE_CLICK_TRIGGER.count
dynamicActions.triggers.RANGE_SELECT_TRIGGER.count
```

### Count by factory and trigger

Count of active dynamic actions (drilldowns) on a saved object by a factory ID and trigger ID.

```
dynamicActions.action_triggers.<factory_id>_<trigger>.count
```

For example:

```
dynamicActions.action_triggers.DASHBOARD_TO_DASHBOARD_DRILLDOWN_VALUE_CLICK_TRIGGER.count
dynamicActions.action_triggers.DASHBOARD_TO_DASHBOARD_DRILLDOWN_RANGE_SELECT_TRIGGER.count
dynamicActions.action_triggers.URL_DRILLDOWN_VALUE_CLICK_TRIGGER.count
```

### Factory metrics

Each dynamic action factory (drilldown type) can report its own stats, which is
done using the `.telemetry()` method on dynamic action factories.
