# Kibana task manager

The task manager is a generic system for running background tasks. It supports:

- Single-run and recurring tasks
- Scheduling tasks to run after a specified datetime
- Basic retry logic
- Recovery of stalled tasks / timeouts
- Tracking task state across multiple runs
- Configuring the run-parameters for specific tasks
- Basic coordination to prevent the same task instance from running on more than one Kibana system at a time

## Implementation details

At a high-level, the task manager works like this:

- Every `{poll_interval}` milliseconds, check the `{index}` for any tasks that need to be run:
  - `runAt` is past
  - `attempts` is less than the configured threshold
- Attempt to claim the task by using optimistic concurrency to set:
  - status to `running`
  - `runAt` to now + the timeout specified by the task
- Execute the task, if the previous claim succeeded
- If the task fails, increment the `attempts` count and reschedule it
- If the task succeeds:
  - If it is recurring, store the result of the run, and reschedule
  - If it is not recurring, remove it from the index

## Pooling

Each task manager instance runs tasks in a pool which ensures that at most N tasks are run at a time, where N is configurable. This prevents the system from running too many tasks at once in resource constrained environments. In addition to this, each individual task can also specify `workersOccupied` to limit how many tasks of a given type can be run at once.

For example, we may have a system with a `max_workers` of 10, but a super expensive task (such as reporting) which specifies a `workersOccupied` of 10.

If a task specifies a higher `workersOccupied` than the system supports, the system's `max_workers` setting will be substituted for it.

## Config options

The task_manager can be configured via `taskManager` config options (e.g. `taskManager.maxAttempts`):

- `max_attempts` - How many times a failing task instance will be retried before it is never run again
- `poll_interval` - How often the background worker should check the task_manager index for more work
- `index` - The name of the index that the task_manager
- `max_workers` - The maximum number of tasks a Kibana will run concurrently (defaults to 10)
- `credentials` - Encrypted user credentials. All tasks will run in the security context of this user. See [this issue](https://github.com/elastic/dev/issues/1045) for a discussion on task scheduler security.

## Task definitions

Plugins define tasks by adding a `taskDefinitions` property to their `uiExports`.

```js
{
  taskDefinitions: {
    // clusterMonitoring is the task type, and must be unique across the entire system
    clusterMonitoring: {
      // Human friendly name, used to represent this task in logs, UI, etc
      title: 'Human friendly name',

      // Optional, human-friendly, more detailed description
      description: 'Amazing!!',

      // Optional, how long, in minutes, the system should wait before
      // a running instance of this task is considered to be timed out.
      // This defaults to 5 minutes.
      timeOut: '5m',

      // The clusterMonitoring task occupies 2 workers, so if the system has 10 worker slots,
      // 5 clusterMonitoring tasks could run concurrently per Kibana instance.
      maxWorkers: 2,

      // The method that actually runs this task. It is passed a task
      // context: { params, state, callCluster }, documented below.
      // Its return value should fit the TaskResult interface, documented
      // below. Invalid return values will result in a logged warning.
      async run(context) {
        // Do some work
        // Conditionally send some alerts
        // Return some result or other...
      },
    },
  },
}
```

When Kibana attempts to claim and run a task instance, it looks its definition up, and executes its run method, passing it a run context which looks like this:

```js
{
  // A function that provides user-scoped access to Elasticsearch
  callCluster,

  // An object, specific to this task instance, used by the
  // task to determine exactly what work should be performed.
  // e.g. a cluster-monitoring task might have a `clusterName`
  // property in here, but a movie-monitoring task might have
  // a `directorName` property.
  params,

  // The state returned from the previous run of this task instance.
  // If this task instance has never succesfully run, this will
  // be an empty object: {}
  state,
}
```

## Task result

The task's run method is expected to return a promise that resolves to an object that conforms to the following interface. Other return values will result in a warning, but the system should continue to work.

```js
{
  // Optional, if specified, this is used as the tasks' nextRun, overriding
  // the default system scheduler.
  runAt: "2020-07-24T17:34:35.272Z",

  // Optional, an error object, logged out as a warning. The pressence of this
  // property indicates that the task did not succeed.
  error: { message: 'Hrumph!' },

  // Optional, this will be passed into the next run of the task, if
  // there is one...
  state: {
    anything: 'goes here',
  },
}
```

If the promise returned by the run function has a cancel method, the cancel method will be called if Kibana determines that the task has timed out. The cancel method itself can return a promise, and Kibana will wait for the cancellation before attempting a re-run. Tasks that spawn processes or threads (e.g. w/ napajs or similar) can perform cleanup work here.

As a convenience, Kibana provides a `Cancellable` helper class in the `@kbn/cancellable` package that provides a cancellable promise implementation. Any task that resolves a sequence of promises can wrap those in a cancellable call to allow Kibana to cancel the task before all promises have resolved. See [packages/kbn-cancellable](../../packages/kbn-cancellable) for details.

## Task instances

The task_manager module will store scheduled task instances in an index. This allows recover of failed tasks, coordination across Kibana clusters, etc.

The data stored for a task instance looks something like this:

```js
{
  // The type of task that will run this instance.
  taskType: 'clusterMonitoring',

  // The next time this task instance should run. It is not guaranteed
  // to run at this time, but it is guaranteed not to run earlier than
  // this.
  runAt: "2020-07-24T17:34:35.272Z",

  // Indicates that this is a recurring task. We currently only support
  // 1 minute granularity.
  interval: '5m',

  // How many times this task has been unsuccesfully attempted,
  // this will be reset to 0 if the task ever succesfully completes.
  // This is incremented if a task fails or times out.
  attempts: 0,

  // Currently, this is either idle | running. It is used to
  // coordinate which Kibana instance owns / is running a specific
  // task instance.
  status: 'idle',

  // The params specific to this task instance, which will be
  // passed to the task when it runs, and will be used by the
  // task to determine exactly what work should be performed.
  // This is a JSON blob, and will be different per task type.
  // e.g. a cluster-monitoring task might have a `clusterName`
  // property in here, but a movie-monitoring task might have
  // a `directorName` property.
  params: '{ "task": "specific stuff here" }',

  // The result of the previous run of this task instance. This
  // will be passed to the next run of the task, along with the
  // params, and could be used by a task to do special logic If
  // the task state changes (e.g. from green to red, or foo to bar)
  // If there was no previous run (e.g. the instance has never succesfully
  // completed, this will be an empty object.). This is a JSON blob,
  // and will be different per task type.
  state: '{ "status": "green" }',

  // The token of the user who scheduled this task, used to ensure
  // the task runs in the same security context as the user who
  // scheduled the task.
  userContext: 'the token of the user who scheduled this task',

  // The id of the user that scheduled this task.
  user: '23lk3l42',

  // An application-specific designation, allowing different Kibana
  // plugins / apps to query for only those tasks they care about.
  scope: 'alerting',
}
```

## Programmatic access

The task manager plugin exposes a taskManager object on the Kibana server which plugins can use to manage scheduled tasks. Each method takes an optional `scope` argument and ensures that only tasks with the specified scope(s) will be affected.

```js
const manager = server.taskManager;

// Schedules a task. All properties are as documented in the previous
// storage section, except that here, params is an object, not a JSON
// string.
const task = manager.schedule({
  taskType,
  runAt,
  interval,
  params,
  scope: 'my-fanci-app',
});

// Removes the specified task
manager.remove({ id: task.id });

// Fetches tasks, supports pagination, via the search-after API:
// https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-search-after.html
// If scope is not specified, all tasks are returned, otherwise only tasks
// with the given scope are returned.
const results = manager.find({ scope: 'my-fanci-app', searchAfter: ['ids'] });

// results look something like this:
{
  searchAfter: ['233322'],
  // Tasks is an array of task instances
  tasks: [{
    id: '3242342',
    taskType: 'reporting',
    // etc
  }]
}
```

More custom access to the tasks can be done directly via Elasticsearch, though that won't be officially supported, as we can change the document structure at any time.

## Limitations in v1.0

In v1, the system only understands 1 minute increments (e.g. '1m', '7m'). Tasks which need something more robust will need to specify their own "runAt" in their run method's return value.

There is only a rudimentary mechanism for coordinating tasks and handling expired tasks. Tasks are considered expired if their runAt has arrived, and their status is still 'running'.

There is no task history. Each run overwrites the previous run's state. One-time tasks are removed from the index upon completion regardless of success / failure.

The task manager's public API is create / delete / list. Updates aren't directly supported, and listing is scoped so that users only see their own tasks.

## Testing

- `node scripts/jest --testPathPattern=task_manager --watch`
