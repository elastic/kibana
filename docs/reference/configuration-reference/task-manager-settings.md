---
navigation_title: "Task Manager settings"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/task-manager-settings-kb.html
applies_to:
  deployment:
    self: all
---

# Task Manager settings in {{kib}} [task-manager-settings-kb]


Task Manager runs background tasks by polling for work on an interval.  You can configure its behavior to tune for performance and throughput.


## Task Manager settings [task-manager-settings]

`xpack.task_manager.max_attempts`
:   The maximum number of times a task will be attempted before being abandoned as failed.  Defaults to 3.

`xpack.task_manager.poll_interval`
:   How often, in milliseconds, the task manager will look for more work.  Defaults to 500 and cannot be lower than 100.

`xpack.task_manager.request_capacity`
:   How many requests can Task Manager buffer before it rejects new requests.  Defaults to 1000.

`xpack.task_manager.max_workers`
:   :::{admonition} Deprecated in 8.16.0
    This setting was deprecated in 8.16.0.
    :::

    The maximum number of tasks that this Kibana instance will run simultaneously.  Defaults to 10. Starting in 8.0, it will not be possible to set the value greater than 100.

`xpack.task_manager.monitored_stats_health_verbose_log.enabled`
:   This flag will enable automatic warn and error logging if task manager self detects a performance issue, such as the time between when a task is scheduled to execute and when it actually executes. Defaults to false.

`xpack.task_manager.monitored_stats_health_verbose_log.warn_delayed_task_start_in_seconds`
:   The amount of seconds we allow a task to delay before printing a warning server log.  Defaults to 60.

`xpack.task_manager.event_loop_delay.monitor`
:   Enables event loop delay monitoring, which will log a warning when a task causes an event loop delay which exceeds the `warn_threshold` setting.  Defaults to true.

`xpack.task_manager.event_loop_delay.warn_threshold`
:   Sets the amount of event loop delay during a task execution which will cause a warning to be logged. Defaults to 5000 milliseconds (5 seconds).

`xpack.task_manager.capacity`
:   Controls the number of tasks that can be run at one time. The minimum value is 5 and the maximum is 50. Defaults to 10.


## Task Manager Health settings [task-manager-health-settings]

Settings that configure the [Health monitoring](docs-content://deploy-manage/monitor/kibana-task-manager-health-monitoring.md) endpoint.

`xpack.task_manager.monitored_task_execution_thresholds`
:   Configures the threshold of failed task executions at which point the `warn` or `error` health status is set under each task type execution status (under `stats.runtime.value.execution.result_frequency_percent_as_number[${task type}].status`).

    This setting allows configuration of both the default level and a custom task type specific level. By default, this setting is configured to mark the health of every task type as `warning` when it exceeds 80% failed executions, and as `error` at 90%.

    Custom configurations allow you to reduce this threshold to catch failures sooner for task types that you might consider critical, such as alerting tasks.

    This value can be set to any number between 0 to 100, and a threshold is hit when the value **exceeds** this number. This means that you can avoid setting the status to `error` by setting the threshold at 100, or hit `error` the moment any task fails by setting the threshold to 0 (as it will exceed 0 once a single failure occurs).


