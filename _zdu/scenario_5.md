Scenario 5: new task type, will old Kibana pick it up
========================================================================

We've added a new task type to the new Kibana, and want to see if 
the old Kibana will pick it up, mark it as unknown, etc.  The
task is defined in 

[usage/task.ts](../x-pack/plugins/alerting/server/usage/task.ts)


This should be the same as scenario 1, which also creates a new task
type, but feels like we should test a new task by itself, outside the
alerting framework.

This adds a "new" alerting telemetry task, that does nothing but log
a line to the Kibana log every 10s.  We'll get both Kibanas started, make
sure the new task is running on the new Kibana, kill that Kibana, ensure
the old Kibana doesn't run it, then start the new Kibana and observe the
new task is running again.

------------------------------------------------------------------------

start old ES / main:

```console
$ yarn es snapshot --license trial
```

start old Kibana / main:

```console
$ yarn start --no-base-path --run-examples
```

start new Kibana - on port 15601 / this branch:

```console
$ yarn start --no-base-path --run-examples --port 15601
```

no script needed since we're just observing the new task running / not running; 
see directions above


outcome
------------------------------------------------------------------------



changes required
------------------------------------------------------------------------



et cetera
------------------------------------------------------------------------

